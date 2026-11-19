#!/usr/bin/env node
/**
 * GlitchRealm — static image build step
 *
 * The repo ships ~18 MB of PNGs. Studio logos used as ~100 px avatars were
 * 1–2.4 MB each, and the favicon "SVG" is a 271 KB raster wrapped in an SVG.
 *
 * This step (idempotent, safe to run on every deploy):
 *   1. Writes downscaled WebP siblings for large PNGs that don't have one yet.
 *   2. Rewrites <img src="...png"> to the generated .webp where available.
 *   3. Re-embeds the favicon raster at 96×96 so the SVG drops from ~271 KB to
 *      a few KB.
 *
 * Originals are left in place so anything still linking them keeps working.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  { dir: 'assets/logos', maxWidth: 256, quality: 82 },
  { dir: 'assets/game logos', maxWidth: 512, quality: 82, skipIfWebpExists: true },
  { dir: 'assets/icons', maxWidth: 256, quality: 82, skipIfWebpExists: true },
];

const FAVICON_SVG = path.join(ROOT, 'assets', 'Favicon and Icons', 'favicon.svg');

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[images] sharp is unavailable — skipping image build');
}

function listHtmlFiles() {
  const files = new Set();
  const add = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        add(full);
      } else if (entry.name.endsWith('.html')) {
        files.add(full);
      }
    }
  };
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html')) files.add(path.join(ROOT, entry.name));
  }
  for (const dir of ['subdomains/pages', 'subdomains/legal', 'subdomains/help', 'components']) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) add(full);
  }
  return [...files];
}

function publicUrlFor(file) {
  // HTML in subdomains/pages is served from the site root; they already use
  // root-relative asset paths, so the mapping is just the path below ROOT.
  return '/' + path.relative(ROOT, file).split(path.sep).join('/');
}

async function buildWebpVariants() {
  const generated = [];
  for (const target of TARGETS) {
    const dir = path.join(ROOT, target.dir);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!/\.(png|jpe?g)$/i.test(name)) continue;
      const source = path.join(dir, name);
      const webp = source.replace(/\.(png|jpe?g)$/i, '.webp');
      if (target.skipIfWebpExists && fs.existsSync(webp)) continue;

      const sourceStat = fs.statSync(source);
      if (fs.existsSync(webp) && fs.statSync(webp).mtimeMs >= sourceStat.mtimeMs) continue;

      try {
        const metadata = await sharp(source).metadata();
        const buffer = await sharp(source)
          .rotate()
          .resize({ width: Math.min(target.maxWidth, metadata.width || target.maxWidth), withoutEnlargement: true })
          .webp({ quality: target.quality, effort: 4 })
          .toBuffer();
        fs.writeFileSync(webp, buffer);
        generated.push({ source, webp, before: sourceStat.size, after: buffer.length });
      } catch (error) {
        console.warn(`[images] skipped ${path.relative(ROOT, source)}: ${error.message}`);
      }
    }
  }
  return generated;
}

function rewriteHtml(generated) {
  const replacements = new Map();
  for (const { source, webp } of generated) {
    const from = path.basename(source);
    const to = path.basename(webp);
    replacements.set(from, to);
  }
  if (!replacements.size) return 0;

  let touched = 0;
  for (const file of listHtmlFiles()) {
    const original = fs.readFileSync(file, 'utf8');
    let next = original;
    for (const [from, to] of replacements) {
      // Only rewrite src attributes that end with the exact PNG filename.
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(`(src=["'][^"']*/)${escaped}(["'])`, 'g'), `$1${to}$2`);
      next = next.replace(new RegExp(`(src=["'])${escaped}(["'])`, 'g'), `$1${to}$2`);
    }
    if (next !== original) {
      fs.writeFileSync(file, next);
      touched += 1;
    }
  }
  return touched;
}

async function shrinkFaviconSvg() {
  if (!fs.existsSync(FAVICON_SVG)) return null;
  const original = fs.readFileSync(FAVICON_SVG, 'utf8');
  const match = original.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!match) return null;

  const png = Buffer.from(match[1], 'base64');
  if (png.length < 50 * 1024) return null;

  const resized = await sharp(png)
    .resize({ width: 96, height: 96, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  const next = original.replace(match[1], resized.toString('base64'));
  if (next.length >= original.length) return null;
  fs.writeFileSync(FAVICON_SVG, next);
  return { before: original.length, after: next.length };
}

async function main() {
  if (!sharp) return;

  const generated = await buildWebpVariants();
  const touched = rewriteHtml(generated);
  const favicon = await shrinkFaviconSvg();

  const saved = generated.reduce((sum, item) => sum + (item.before - item.after), 0);
  if (generated.length || touched || favicon) {
    console.log(
      `[images] ${generated.length} WebP variants (${(saved / 1024 / 1024).toFixed(1)} MB saved), ` +
        `${touched} HTML file(s) updated` +
        (favicon ? `, favicon.svg ${(favicon.before / 1024).toFixed(0)} KB -> ${(favicon.after / 1024).toFixed(0)} KB` : '')
    );
  } else {
    console.log('[images] already up to date');
  }
}

main().catch((error) => {
  console.warn('[images] Failed:', error?.message || error);
});
