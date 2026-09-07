#!/usr/bin/env node
/**
 * Verify every local image referenced by content frontmatter actually exists.
 *
 * Astro resolves image() at content-sync time, before drafts are filtered out,
 * so one missing file breaks the entire build -- and the raw error points at a
 * file inside node_modules rather than naming the entry at fault. This runs
 * first and says exactly which entry references what.
 */
import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';

const DIR = 'src/content/work';
const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
const problems = [];

for (const file of files) {
  const path = join(DIR, file);
  const text = await readFile(path, 'utf8');
  const front = text.split('---')[1] ?? '';

  for (const m of front.matchAll(/^\s*(?:-\s*)?src:\s*(\.\.[^\s#]+)/gm)) {
    const rel = m[1].trim();
    const abs = resolve(dirname(path), rel);
    try {
      await access(abs);
    } catch {
      problems.push({ file, rel });
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} referenced image(s) missing:\n`);
  for (const p of problems) console.error(`  ${p.file}\n    -> ${p.rel}\n`);
  console.error('Re-upload from the CMS, or remove the reference. A draft with a');
  console.error('missing image still breaks the build.\n');
  process.exit(1);
}
console.log(`Media check: ${files.length} entries, all referenced images present.`);
