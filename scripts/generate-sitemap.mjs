#!/usr/bin/env node
/**
 * Refreshes the committed sitemap.xml from the same data the build uses:
 * the curated public page list plus one URL per published game.
 *
 * The build also writes dist/sitemap.xml from this module, so the deployed
 * sitemap and the repository copy stay identical.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSitemapXml } from './lib/sitemap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const xml = buildSitemapXml(ROOT);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
const count = (xml.match(/<url>/g) || []).length;
console.log(`[sitemap] wrote ${count} URLs to sitemap.xml`);
