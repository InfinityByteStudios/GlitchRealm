#!/usr/bin/env node
/**
 * Minimal static preview server for `dist/`.
 *
 * `npx serve -s .` can't serve this site correctly: every public URL is a
 * rewrite in `_redirects` (/games.html -> /subdomains/pages/games/games.html),
 * so pages 404 and relative assets break. This server applies the same-origin
 * rewrites so Lighthouse/CI sees what production sees.
 *
 * Usage: node scripts/serve-preview.mjs [port] [--dir=dist]
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const portArg = process.argv.slice(2).find((arg) => /^\d+$/.test(arg));
const dirArg = process.argv.slice(2).find((arg) => arg.startsWith('--dir='));
const PORT = Number(portArg || process.env.PORT || 5000);
const BASE = path.resolve(ROOT, (dirArg && dirArg.split('=')[1]) || 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function loadRewrites() {
  const file = path.join(ROOT, '_redirects');
  const rules = [];
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const [from, to, statusRaw] = parts;
    const status = Number(statusRaw);
    if (!from.startsWith('/') || !to.startsWith('/')) continue;
    if (![200, 301, 302].includes(status)) continue;
    rules.push({ from, to, status });
  }
  return rules;
}

const rewrites = loadRewrites();

// Netlify serves text assets compressed; without this the preview server made
// Lighthouse report ~200 KiB of fake "enable text compression" savings.
const COMPRESSIBLE = new Set([
  '.html', '.css', '.js', '.mjs', '.json',
  '.webmanifest', '.svg', '.txt', '.xml',
]);
const compressedCache = new Map();

function compressed(file, encoding) {
  const stat = fs.statSync(file);
  const key = `${file}:${stat.mtimeMs}:${stat.size}`;
  let entry = compressedCache.get(key);
  if (!entry) {
    if (compressedCache.size > 200) compressedCache.clear();
    const raw = fs.readFileSync(file);
    entry = {
      gzip: zlib.gzipSync(raw, { level: 6 }),
      br: zlib.brotliCompressSync(raw, {
        // Preview only needs realistic transfer sizes; quality 11 costs enough
        // CPU to distort Lighthouse timings under CI's single-process server.
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
      }),
    };
    compressedCache.set(key, entry);
  }
  return entry[encoding] || null;
}

function resolveFile(pathname) {
  const candidates = [];

  for (const rule of rewrites) {
    if (rule.from === pathname) candidates.push(rule.to);
  }
  candidates.push(pathname);

  for (const candidate of candidates) {
    let file = path.join(BASE, decodeURIComponent(candidate));
    if (file.endsWith('/')) file = path.join(file, 'index.html');

    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;

    if (!path.extname(file) && fs.existsSync(`${file}.html`)) return `${file}.html`;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const file = resolveFile(url.pathname);

  if (!file) {
    const notFound = path.join(BASE, '404.html');
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': MIME['.html'] });
      res.end(fs.readFileSync(notFound));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  };
  if (ext === '.html') headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
  else headers['Cache-Control'] = 'public, max-age=31536000, immutable';

  if (COMPRESSIBLE.has(ext)) {
    const accept = String(req.headers['accept-encoding'] || '');
    const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
    const body = encoding ? compressed(file, encoding) : null;

    headers['Vary'] = 'Accept-Encoding';
    if (body) {
      headers['Content-Encoding'] = encoding;
      headers['Content-Length'] = body.length;
      res.writeHead(200, headers);
      res.end(body);
      return;
    }
  }

  headers['Content-Length'] = fs.statSync(file).size;
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Preview serving ${path.relative(ROOT, BASE) || '.'} on http://localhost:${PORT}`);
});
