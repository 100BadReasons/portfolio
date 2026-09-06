#!/usr/bin/env node
/**
 * Remove emitted assets that no built page references.
 *
 * Astro emits the original source image for anything imported by a content
 * collection schema, even when no built page renders it. Draft entries
 * (`published: false`) are exactly that case: their multi-MB source renders
 * ship to production as dead weight while the draft itself is excluded.
 *
 * This scans every emitted HTML/CSS/JS file for each asset's filename and
 * deletes only the ones with zero references. Referenced assets are untouched,
 * so it cannot break a page.
 */
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, '_astro');
const SCAN_EXT = new Set(['.html', '.css', '.js', '.xml', '.json']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const all = await walk(DIST).catch(() => []);
if (!all.length) {
  console.error('No dist/ directory — run the build first.');
  process.exit(1);
}

const haystack = (
  await Promise.all(
    all.filter((f) => SCAN_EXT.has(extname(f))).map((f) => readFile(f, 'utf8').catch(() => '')),
  )
).join('\n');

const assets = await walk(ASSETS).catch(() => []);
let freed = 0;
const removed = [];

for (const asset of assets) {
  const name = asset.split('/').pop();
  if (haystack.includes(name)) continue;
  const { size } = await stat(asset);
  await unlink(asset);
  freed += size;
  removed.push(`${name} (${Math.round(size / 1024)} KB)`);
}

if (removed.length) {
  console.log(`Pruned ${removed.length} unreferenced asset(s), freed ${Math.round(freed / 1024)} KB:`);
  for (const r of removed) console.log(`  - ${r}`);
} else {
  console.log('No unreferenced assets.');
}
