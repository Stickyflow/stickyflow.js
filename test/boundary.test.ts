import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

// Enforces the static ⟷ interaction separation the package is built around:
// the static core (everything under src/ except src/viewer/) must not depend on
// the interaction tier, and must stay DOM-free so it keeps rendering headless.
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../src');
const viewerDir = resolve(srcDir, 'viewer');

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

const staticFiles = tsFiles(srcDir).filter(f => !f.startsWith(viewerDir));

describe('static / interaction separation', () => {
  it('static core never imports from the viewer (one-way dependency)', () => {
    const offenders = staticFiles.filter(f => /from ['"][^'"]*\/viewer(\/|['"])/.test(readFileSync(f, 'utf8')));
    expect(offenders.map(f => relative(srcDir, f))).toEqual([]);
  });

  it('static core uses no DOM globals (stays headless)', () => {
    // Match real API use (document.foo, new DOMParser) — not the 'document'
    // shape-type string that legitimately appears in the render code.
    const domRe = /\b(document|window|navigator|localStorage)\s*\.|new\s+DOMParser|\bCSS\s*\.\s*escape/;
    const offenders = staticFiles.filter(f => domRe.test(readFileSync(f, 'utf8')));
    expect(offenders.map(f => relative(srcDir, f))).toEqual([]);
  });

  it('the static entry (index.ts) re-exports nothing from the viewer', () => {
    const index = readFileSync(join(srcDir, 'index.ts'), 'utf8');
    expect(index).not.toMatch(/from ['"][^'"]*viewer/);
  });
});
