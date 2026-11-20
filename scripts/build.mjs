#!/usr/bin/env node
/**
 * GlitchRealm — static site build
 *
 * Netlify's legacy "asset optimization" post-processing no longer runs, so the
 * site used to be deployed byte-identical to source (no minification, no
 * cache-busting, client-side header/footer injection).
 *
 * This build produces `dist/`:
 *   1. copies the deployable site (skipping dev/tooling files)
 *   2. inlines components/header.html + components/footer.html into each page
 *      (removes 2 requests, the header CLS and the script.js -> fetch chain)
 *   3. dedupes duplicate script/stylesheet tags created by inlining
 *   4. minifies HTML, CSS and JS
 *   5. adds a content-derived `?v=<build id>` to CSS/JS URLs (HTML + module
 *      imports) so those files can be cached immutably
 *   6. writes a real copy of each 200-rewrite target at its public URL, so a
 *      missing/ignored `_redirects` rule can never turn a page into a 404
 *
 * Run `scripts/optimize-static-images.js`, `generate-cover-thumbs.js`,
 * `generate-prerendered-content.js` and `generate-sitemap.js` first (see the
 * `build` command in netlify.toml).
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transform as esbuildTransform } from 'esbuild';
import { transform as lightningTransform } from 'lightningcss';
import { minify as minifyHtml } from 'html-minifier-terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const SKIP_TOP_LEVEL = new Set([
  '.git',
  '.github',
  '.kiro',
  '.vscode',
  '.netlify',
  'node_modules',
  'dist',
  'scripts',
  'docs',
  'config',
  'supabase',
  'netlify',
  'functions',
  'emails',
  'package.json',
  'package-lock.json',
  'deno.lock',
  '.nvmrc',
  '.gitignore',
  '.firebaserc',
  'firebase.json',
  'README.md',
  'LICENSE',
  'LICENSE-ASSETS',
  'LICENSED',
  'NOTICE',
  'NOTICE copy',
]);

const stats = { files: 0, html: 0, css: 0, js: 0, inlined: 0, deduped: 0, cssInlined: 0, bytesBefore: 0, bytesAfter: 0 };

function log(message) {
  console.log(`[build] ${message}`);
}

async function copyTree(source, target) {
  const entries = await fsp.readdir(source, { withFileTypes: true });
  await fsp.mkdir(target, { recursive: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (source === ROOT && SKIP_TOP_LEVEL.has(entry.name)) continue;

    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyTree(from, to);
    } else if (entry.isFile()) {
      await fsp.copyFile(from, to);
      stats.files += 1;
      stats.bytesBefore += (await fsp.stat(from)).size;
    }
  }
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, text) {
  fs.writeFileSync(file, text);
  stats.bytesAfter += Buffer.byteLength(text);
}

async function listFiles(dir, ext, out = []) {
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 0. Syntax guard for inline scripts
// ---------------------------------------------------------------------------

/**
 * Inline <script> blocks are never parsed by the minifier, so a stray
 * top-level `await` (or any typo) ships as a silent runtime failure: the
 * module never executes and the page just stays un-hydrated. Parse every
 * JavaScript inline block with esbuild so `npm run build` fails instead.
 */
const NON_JS_SCRIPT = /^(?:application\/(?:ld\+)?json|text\/template|text\/plain|importmap|speculationrules)$/i;

async function validateInlineScripts(file, html) {
  const errors = [];

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1];
    const code = match[2];
    if (!code.trim()) continue;
    if (/\bsrc\s*=/i.test(attrs)) continue;

    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (type && NON_JS_SCRIPT.test(type.trim())) continue;

    try {
      await esbuildTransform(code, {
        loader: type && /typescript/i.test(type) ? 'ts' : 'js',
        // Parse only — formatting output is thrown away.
        minify: false,
      });
    } catch (error) {
      const where = (error.errors && error.errors[0]) || {};
      const line = where.location ? `:${where.location.line}` : '';
      errors.push(`${path.relative(ROOT, file)}${line} — ${where.text || error.message}`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// 1. Inline header/footer partials
// ---------------------------------------------------------------------------

const HEADER_PLACEHOLDER = /<div\s+id="header-placeholder"\s*>\s*<\/div>/i;
const FOOTER_PLACEHOLDER = /<div\s+id="footer-placeholder"\s*>\s*<\/div>/i;

function inlinePartials(htmlFile, header, footer) {
  let html = readText(htmlFile);
  let changed = false;

  if (HEADER_PLACEHOLDER.test(html)) {
    html = html.replace(
      HEADER_PLACEHOLDER,
      `<div id="header-placeholder" data-inlined="1">\n${header}\n</div>`
    );
    changed = true;
  }
  if (FOOTER_PLACEHOLDER.test(html)) {
    html = html.replace(
      FOOTER_PLACEHOLDER,
      `<div id="footer-placeholder" data-inlined="1">\n${footer}\n</div>`
    );
    changed = true;
  }

  if (!changed) return null;
  stats.inlined += 1;
  return html;
}

/**
 * Inlining the same partial on every page can duplicate <script src> or
 * stylesheet links that a page already loaded itself. Keep the first
 * occurrence only.
 */
function dedupeTags(html) {
  const seen = new Set();
  let removed = 0;

  html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
    const key = 'js:' + src.split('?')[0];
    if (seen.has(key)) {
      removed += 1;
      return '';
    }
    seen.add(key);
    return tag;
  });

  const seenCss = new Set();
  html = html.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const match = tag.match(/\bhref=["']([^"']+)["']/i);
    if (!match) return tag;
    const key = 'css:' + match[1].split('?')[0];
    if (seenCss.has(key)) {
      removed += 1;
      return '';
    }
    seenCss.add(key);
    return tag;
  });

  stats.deduped += removed;
  return html;
}

function stripStaleHints(html) {
  // Header/footer are inlined now; the preload would be a wasted request.
  html = html.replace(/<link\b[^>]*rel=["']preload["'][^>]*as=["']fetch["'][^>]*components\/header\.html[^>]*>/gi, '');

  // Drop the redundant preload for the main stylesheet ONLY (the stylesheet
  // itself is discovered by the parser). Async CSS loaders such as
  // <link rel="preload" as="style" onload="this.rel='stylesheet'"> must stay.
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']preload["']/i.test(tag) || !/as=["']style["']/i.test(tag)) return tag;
    if (/onload=/i.test(tag)) return tag;
    const href = (tag.match(/href=["']([^"']+)/i) || [])[1] || '';
    return /\/css\/styles\.css$/.test(href.split('?')[0]) ? '' : tag;
  });

  // Meta cache directives are ignored by browsers/CDNs and only add confusion.
  html = html.replace(/<meta\s+http-equiv=["']Cache-Control["'][^>]*>\s*/gi, '');
  return html;
}

// ---------------------------------------------------------------------------
// 2. Fingerprinting
// ---------------------------------------------------------------------------

function hashBuildId(files) {
  const hash = crypto.createHash('sha256');
  for (const file of files.sort()) {
    hash.update(path.relative(ROOT, file));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex').slice(0, 10);
}

/** Adds ?v=<id> to CSS/JS URLs referenced from HTML and JS module specifiers. */
function addVersion(html, buildId) {
  // src/href attributes (skip external URLs)
  html = html.replace(
    /(\b(?:src|href)=)(["'])([^"':]+?\.(?:css|js))(\?[^"']*)?\2/gi,
    (match, attr, quote, url, query) => {
      if (/^(?:https?:)?\/\//i.test(url) || url.startsWith('data:')) return match;
      return `${attr}${quote}${url}?v=${buildId}${quote}`;
    }
  );

  // Module specifiers inside inline scripts: import './x.js' / import('./x.js')
  html = html.replace(
    /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+?\.js)(\?[^"']*)?\2/g,
    (match, lead, quote, url) => `${lead}${quote}${url}?v=${buildId}${quote}`
  );

  // Quoted local js/ paths inside inline scripts (runtime-created <script>).
  html = versionAssetStrings(html, buildId);

  return html;
}

/** Adds ?v=<id> to local js/ asset URLs written as string literals. */
function versionAssetStrings(code, buildId) {
  // Runtime-created tags (script.src = '/js/x.js') bypass HTML attribute
  // rewriting, and /js/* is served immutable, so those strings need the build id.
  return code.replace(
    /(["'])((?:\.{1,2}\/|\/)?js\/[A-Za-z0-9._-]+\.js)(\?[^"']*)?\1/g,
    (match, quote, url) => `${quote}${url}?v=${buildId}${quote}`
  );
}

function versionJsImports(code, buildId) {
  return versionAssetStrings(
    code.replace(
      /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+?\.js)(\?[^"']*)?\2/g,
      (match, lead, quote, url) => `${lead}${quote}${url}?v=${buildId}${quote}`
    ),
    buildId
  );
}

// ---------------------------------------------------------------------------
// 3. Minification
// ---------------------------------------------------------------------------

async function minifyCssFile(file) {
  const code = fs.readFileSync(file);
  try {
    const result = lightningTransform({ filename: file, code, minify: true });
    fs.writeFileSync(file, result.code);
    return code.length - result.code.length;
  } catch (error) {
    console.warn(`[build] CSS minify failed for ${path.relative(ROOT, file)}: ${error.message}`);
    return 0;
  }
}

async function minifyJsFile(file) {
  const code = readText(file);
  try {
    const result = await esbuildTransform(code, {
      loader: 'js',
      minify: true,
      legalComments: 'none',
      target: 'es2020',
    });
    fs.writeFileSync(file, result.code);
    return Buffer.byteLength(code) - Buffer.byteLength(result.code);
  } catch (error) {
    console.warn(`[build] JS minify failed for ${path.relative(ROOT, file)}: ${error.message}`);
    return 0;
  }
}

async function minifyHtmlFile(file) {
  const html = readText(file);
  const before = Buffer.byteLength(html);
  let result;
  try {
    result = await minifyHtml(html, {
      collapseWhitespace: 'conservative',
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: false,
      removeAttributeQuotes: false,
      removeEmptyAttributes: false,
      keepClosingSlash: true,
      minifyCSS: false,
      minifyJS: false,
      caseSensitive: true,
      continueOnParseError: true,
    });
  } catch (error) {
    console.warn(`[build] HTML minify failed for ${path.relative(ROOT, file)}: ${error.message}`);
    return 0;
  }
  if (Buffer.byteLength(result) > before) result = html;
  fs.writeFileSync(file, result);
  return before - Buffer.byteLength(result);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Small page-specific stylesheets are inlined into the page. Each external
 * stylesheet costs a full round trip before first paint, so folding a 5 KB
 * sheet into the document is a net win for pages that only use it once. Files
 * over the size limit (styles.css) and sheets with relative url()/@import stay
 * external so path resolution can't break.
 */
const INLINE_CSS_LIMIT = 25 * 1024;

function inlineSmallStylesheets(file) {
  const htmlFile = file;
  const html = readText(htmlFile);
  let inlined = 0;

  const result = html.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, (tag, offset, source) => {
    // Skip the <noscript> fallback copies.
    if (source.slice(Math.max(0, offset - 20), offset).includes('<noscript>')) return tag;

    // Only plain, unconditional links: media/onload/disabled sheets keep their
    // own loading semantics.
    if (!/^<link\s+rel=["']stylesheet["']\s+href=["'][^"']+["']\s*\/?>$/i.test(tag)) return tag;

    const href = tag.match(/href=["']([^"']+)["']/i)[1];
    if (/^(?:https?:)?\/\//i.test(href)) return tag;

    const cssFile = path.join(path.dirname(htmlFile), href.split('?')[0]);
    if (!fs.existsSync(cssFile)) return tag;

    const css = readText(cssFile);
    if (Buffer.byteLength(css) > INLINE_CSS_LIMIT) return tag;
    if (/\burl\(|@import\b/i.test(css)) return tag;

    inlined += 1;
    return `<style>${css}</style>`;
  });

  if (inlined) {
    writeText(htmlFile, result);
    stats.cssInlined = (stats.cssInlined || 0) + inlined;
  }
}

/**
 * Emits a real copy of every 200-rewrite target at its public URL.
 *
 * The site keeps its sources under `subdomains/pages/...` and relies on
 * `_redirects` for URLs like `/games.html`. Netlify silently stopped applying
 * those rules on this deploy (headers were ignored too), which turned every
 * public page into a 404. Netlify skips a non-forced 200 rewrite when the
 * requested path already exists, so shipping the page itself at the public URL
 * makes the routes resilient — redirects become an optimization, not a
 * requirement.
 */
function writePublicUrlPages() {
  const redirectsFile = path.join(DIST, '_redirects');
  if (!fs.existsSync(redirectsFile)) return 0;

  const written = new Set();
  let count = 0;

  for (const raw of readText(redirectsFile).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const [from, to, status = '301'] = line.split(/\s+/);
    if (status !== '200') continue;
    if (!from.startsWith('/') || !to.startsWith('/')) continue;
    // Dynamic rules (splats/placeholders/query strings) need the redirect engine.
    if (/[*?:]/.test(from) || /[*?:]/.test(to)) continue;
    if (from.startsWith('/components/') || to.startsWith('/components/')) continue;

    const target = path.join(DIST, to.replace(/^\//, ''));
    if (!target.endsWith('.html') || !fs.existsSync(target)) continue;

    // Extensionless public URLs resolve to the `.html` copy via pretty URLs.
    const publicPath = from.endsWith('.html') ? from : `${from}.html`;
    if (publicPath === to) continue;

    const out = path.join(DIST, publicPath.replace(/^\//, ''));
    if (written.has(out) || fs.existsSync(out)) continue;

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(target, out);
    written.add(out);
    count += 1;
  }

  return count;
}

async function main() {
  log('cleaning dist/');
  await fsp.rm(DIST, { recursive: true, force: true });

  log('copying site');
  await copyTree(ROOT, DIST);

  const header = readText(path.join(ROOT, 'components', 'header.html')).trim();
  const footer = readText(path.join(ROOT, 'components', 'footer.html')).trim();

  const sourceCss = await listFiles(path.join(ROOT, 'css'), '.css');
  const sourceJs = await listFiles(path.join(ROOT, 'js'), '.js');
  const buildId = hashBuildId([
    ...sourceCss,
    ...sourceJs,
    path.join(ROOT, 'components', 'header.html'),
    path.join(ROOT, 'components', 'footer.html'),
  ]);
  log(`build id ${buildId}`);

  const htmlFiles = (await listFiles(DIST, '.html')).filter(
    (file) => !file.includes(`${path.sep}components${path.sep}`)
  );

  log('inlining header/footer');
  const scriptErrors = [];
  for (const file of htmlFiles) {
    const inlined = inlinePartials(file, header, footer);
    const html = inlined ?? readText(file);
    const cleaned = stripStaleHints(dedupeTags(html));
    writeText(file, addVersion(cleaned, buildId));
    scriptErrors.push(...(await validateInlineScripts(file, html)));
  }

  if (scriptErrors.length) {
    console.error(`[build] ${scriptErrors.length} inline script(s) failed to parse:`);
    for (const message of scriptErrors.slice(0, 20)) console.error(`  - ${message}`);
    process.exit(1);
  }

  log('versioning JS module imports');
  for (const file of await listFiles(path.join(DIST, 'js'), '.js')) {
    writeText(file, versionJsImports(readText(file), buildId));
  }

  log('minifying CSS');
  let cssSaved = 0;
  for (const file of await listFiles(path.join(DIST, 'css'), '.css')) {
    cssSaved += await minifyCssFile(file);
    stats.css += 1;
  }

  log('minifying JS');
  let jsSaved = 0;
  for (const file of await listFiles(path.join(DIST, 'js'), '.js')) {
    jsSaved += await minifyJsFile(file);
    stats.js += 1;
  }

  log('inlining small stylesheets');
  for (const file of htmlFiles) inlineSmallStylesheets(file);

  log('minifying HTML');
  let htmlSaved = 0;
  for (const file of htmlFiles) {
    htmlSaved += await minifyHtmlFile(file);
    stats.html += 1;
  }

  log('writing public URL pages');
  const publicPages = writePublicUrlPages();

  const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  log(
    `${stats.html} pages, ${stats.css} CSS, ${stats.js} JS — ` +
      `CSS -${(cssSaved / 1024).toFixed(1)} KB, JS -${(jsSaved / 1024).toFixed(1)} KB, HTML -${(htmlSaved / 1024).toFixed(1)} KB`
  );
  log(`inlined partials on ${stats.inlined} pages, removed ${stats.deduped} duplicate tag(s), ${mb(stats.bytesBefore)} copied`);
  if (stats.cssInlined) log(`inlined ${stats.cssInlined} small stylesheet(s) into their page`);
  log(`wrote ${publicPages} public URL page(s) so routes work without rewrites`);
}

main().catch((error) => {
  console.error('[build] Failed:', error);
  process.exit(1);
});
