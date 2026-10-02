import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');

const TIERS = [
  'runtime/dom',
  'runtime/eventing',
  'runtime/viewer',
  'runtime/interaction',
  'runtime/webComponent',
] as const;
const TIER_RANK: Record<string, number> = {
  core: 0,
  'runtime/dom': 1,
  'runtime/eventing': 1,
  'runtime/viewer': 2,
  'runtime/interaction': 3,
  'runtime/webComponent': 4,
};

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return tsFiles(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function posixRelative(file: string): string {
  return relative(srcDir, file).split('\\').join('/');
}

function tierOfPath(relativePath: string): string {
  return TIERS.find(tier => relativePath === tier || relativePath.startsWith(`${tier}/`)) ?? 'core';
}

function relativeImports(source: string): string[] {
  return [...source.matchAll(/from\s+'(\.[^']*)'/g)].map(match => match[1]);
}

const allFiles = tsFiles(srcDir);
const staticFiles = allFiles.filter(f => tierOfPath(posixRelative(f)) === 'core');

describe('tier layering', () => {
  it('no module imports from a higher tier', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      const from = posixRelative(file);
      const ownRank = TIER_RANK[tierOfPath(from)];
      for (const specifier of relativeImports(readFileSync(file, 'utf8'))) {
        const target = posixRelative(resolve(dirname(file), specifier));
        const targetRank = TIER_RANK[tierOfPath(target)];
        if (targetRank > ownRank) {
          offenders.push(`${from} -> ${target}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('interaction reaches the viewer only through its public entry', () => {
    const offenders: string[] = [];
    for (const file of allFiles.filter(f => tierOfPath(posixRelative(f)) === 'runtime/interaction')) {
      for (const specifier of relativeImports(readFileSync(file, 'utf8'))) {
        const target = posixRelative(resolve(dirname(file), specifier));
        if (target !== 'runtime/viewer' && target.startsWith('runtime/viewer/')) {
          offenders.push(`${posixRelative(file)} -> ${target}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('static core uses no DOM globals (stays headless)', () => {
    const domRe = /\b(document|window|navigator|localStorage)\s*\.|new\s+DOMParser|\bCSS\s*\.\s*escape/;
    const offenders = staticFiles.filter(f => domRe.test(readFileSync(f, 'utf8')));
    expect(offenders.map(f => posixRelative(f))).toEqual([]);
  });

  it('the static entry (index.ts) re-exports nothing from a browser tier', () => {
    const entry = join(srcDir, 'index.ts');
    const offenders = relativeImports(readFileSync(entry, 'utf8'))
      .map(specifier => posixRelative(resolve(dirname(entry), specifier)))
      .filter(target => tierOfPath(target) !== 'core');
    expect(offenders).toEqual([]);
  });
});
