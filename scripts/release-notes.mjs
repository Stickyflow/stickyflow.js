// Prints the CHANGELOG.md section of one version, for the GitHub release body.
// Usage: node scripts/release-notes.mjs <version>
// Fails when the section is missing or empty, so a release cannot go out
// without its changelog entry.
import { readFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <version>');
  process.exit(1);
}

const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`No "## [${version}]" section in CHANGELOG.md`);
  process.exit(1);
}

// The section ends at the next version heading or at the link references at the bottom.
let end = lines.findIndex((line, i) => i > start && (line.startsWith('## ') || /^\[[^\]]+\]: /.test(line)));
if (end === -1) {
  end = lines.length;
}

const notes = lines
  .slice(start + 1, end)
  .join('\n')
  .trim();
if (!notes) {
  console.error(`The "## [${version}]" section in CHANGELOG.md is empty`);
  process.exit(1);
}

console.log(notes);
