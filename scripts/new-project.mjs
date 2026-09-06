#!/usr/bin/env node
// Scaffold a new case study from the template: npm run new -- my-slug
import { copyFile, access } from 'node:fs/promises';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: npm run new -- <kebab-case-slug>');
  process.exit(1);
}

const dest = `src/content/work/${slug}.mdx`;
try {
  await access(dest);
  console.error(`${dest} already exists.`);
  process.exit(1);
} catch {}

await copyFile('src/content/work/example-project.mdx', dest);
console.log(`Created ${dest}`);
console.log(`Next: ./scripts/encode-preview.sh <master> ${slug} <start> <duration>`);
