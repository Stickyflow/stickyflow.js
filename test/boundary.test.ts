import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Enforces the static ⟷ interaction separation the package is built around:
// the static core (everything under src/ except src/viewer/) must not depend on
// the interaction tier, and must stay DOM-free so it keeps rendering headless.
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../src');
// Browser tiers: they may use the DOM and depend on the static core. The static
// core is everything else and must stay headless and self-contained.
const browserTiers = [resolve(srcDir, 'viewer'), resolve(srcDir, 'web-component'), resolve(srcDir, 'interaction')];

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

const staticFiles = tsFiles(srcDir).filter(f => !browserTiers.some(dir => f.startsWith(dir)));

describe('static / interaction separation', () => {
  it('static core never imports from a browser tier (one-way dependency)', () => {
    const offenders = staticFiles.filter(f =>
      /from ['"][^'"]*\/(viewer|web-component|interaction)(\/|['"])/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders.map(f => relative(srcDir, f))).toEqual([]);
  });

  it('static core uses no DOM globals (stays headless)', () => {
    // Match real API use (document.foo, new DOMParser) — not the 'document'
    // shape-type string that legitimately appears in the render code.
    const domRe = /\b(document|window|navigator|localStorage)\s*\.|new\s+DOMParser|\bCSS\s*\.\s*escape/;
    const offenders = staticFiles.filter(f => domRe.test(readFileSync(f, 'utf8')));
    expect(offenders.map(f => relative(srcDir, f))).toEqual([]);
  });

  it('the static entry (index.ts) re-exports nothing from a browser tier', () => {
    const index = readFileSync(join(srcDir, 'index.ts'), 'utf8');
    expect(index).not.toMatch(/from ['"][^'"]*(viewer|web-component|interaction)/);
  });
});
