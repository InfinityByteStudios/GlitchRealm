#!/usr/bin/env node
/**
 * GlitchRealm — build-time cover thumbnails
 *
 * Game covers live in Supabase Storage and are served with
 * `Cache-Control: private, no-cache` and no image transformation support, so
 * the games grid can pull 5–7 MB of full-size artwork per visit.
 *
 * This script downloads each published game's cover at build time, emits
 * reasonably sized WebP thumbnails into `assets/cover-thumbs/`, and writes a
 * manifest that `generate-prerendered-content.js` uses to reference them.
 * The originals stay untouched (game detail pages still use them).
 *
 * Fail-soft by design: no network, no sharp, or a broken cover URL must never
 * fail the deploy. Existing thumbnails/manifest are kept in that case.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIRESTORE_RUN_QUERY =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

const PUBLISHED_STATUSES = ['published', 'Published'];

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'cover-thumbs');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const MANIFEST_URL_PREFIX = '/assets/cover-thumbs';

const SIZES = [
  { suffix: '480', width: 480 },
  { suffix: '960', width: 960 },
];
const WEBP_QUALITY = 72;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const CONCURRENCY = 4;

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[covers] sharp is unavailable — skipping thumbnail generation');
}

function hashUrl(url) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function isSupabaseCover(url) {
  return typeof url === 'string' && /^https:\/\/[^/]+\/storage\/v1\/object\/public\//.test(url);
}

async function fetchPublishedCoverUrls(limit = 200) {
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'game_submissions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'IN',
          value: { arrayValue: { values: PUBLISHED_STATUSES.map((s) => ({ stringValue: s })) } },
        },
      },
      limit: { value: limit },
    },
  };

  const resp = await fetch(FIRESTORE_RUN_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    console.warn(`[covers] Firestore runQuery failed (${resp.status}) — keeping existing thumbnails`);
    return [];
  }

  const rows = await resp.json();
  if (!Array.isArray(rows)) return [];

  const urls = new Set();
  for (const row of rows) {
    const fields = row?.document?.fields;
    const url = fields?.coverImageUrl?.stringValue;
    if (url) urls.add(url.trim());
  }
  return [...urls];
}

function loadManifest() {
  try {
    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (raw && typeof raw === 'object') return raw;
  } catch (e) {
    /* no manifest yet */
  }
  return {};
}

async function fetchImage(url) {
  const resp = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
    headers: { Accept: 'image/webp,image/png,image/jpeg,image/*' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const length = Number(resp.headers.get('content-length') || 0);
  if (length > MAX_SOURCE_BYTES) throw new Error(`cover too large (${length} bytes)`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length > MAX_SOURCE_BYTES) throw new Error(`cover too large (${buffer.length} bytes)`);
  return buffer;
}

async function processCover(url, entry) {
  const hash = hashUrl(url);
  const files = SIZES.map((size) => ({
    ...size,
    file: path.join(OUT_DIR, `${hash}-${size.suffix}.webp`),
    url: `${MANIFEST_URL_PREFIX}/${hash}-${size.suffix}.webp`,
  }));

  const allExist = files.every((f) => fs.existsSync(f.file));
  if (allExist && entry && entry.w480 && entry.w960) return { entry, cached: true };

  const buffer = await fetchImage(url);
  const image = sharp(buffer, { failOn: 'none' });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error('could not read image dimensions');

  for (const target of files) {
    const width = Math.min(target.width, metadata.width);
    await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(target.file);
  }

  const small = await sharp(files[0].file).metadata();
  return {
    entry: {
      w480: files[0].url,
      w960: files[1].url,
      width: small.width || files[0].width,
      height: small.height || Math.round((files[0].width * metadata.height) / metadata.width),
      source: url,
    },
    cached: false,
  };
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  if (!sharp) return;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const previous = loadManifest();
  const urls = (await fetchPublishedCoverUrls()).filter(isSupabaseCover);

  if (!urls.length) {
    console.log('[covers] No Supabase covers found — leaving manifest unchanged');
    return;
  }

  const manifest = {};
  let generated = 0;
  let cached = 0;
  let failed = 0;

  const results = await runPool(
    urls,
    async (url) => {
      try {
        const result = await processCover(url, previous[url]);
        if (result.cached) cached += 1;
        else generated += 1;
        manifest[url] = result.entry;
      } catch (error) {
        failed += 1;
        console.warn(`[covers] skipped ${url.split('/').pop()}: ${error.message}`);
        // Keep a previously generated thumbnail if we still have one.
        if (previous[url]) manifest[url] = previous[url];
      }
    },
    CONCURRENCY
  );
  void results;

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  // Drop thumbnails no longer referenced by any published game.
  const keep = new Set();
  for (const entry of Object.values(manifest)) {
    for (const key of ['w480', 'w960']) {
      if (entry[key]) keep.add(path.basename(entry[key]));
    }
  }
  let removed = 0;
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (!/^[a-f0-9]{16}-\d+\.webp$/.test(name)) continue;
    if (keep.has(name)) continue;
    fs.unlinkSync(path.join(OUT_DIR, name));
    removed += 1;
  }

  const bytes = fs.statSync(MANIFEST_PATH).size;
  console.log(
    `[covers] ${Object.keys(manifest).length} covers (${generated} generated, ${cached} cached, ${failed} failed, ${removed} removed) — manifest ${bytes} bytes`
  );
}

main().catch((error) => {
  console.warn('[covers] Failed:', error?.message || error);
});
