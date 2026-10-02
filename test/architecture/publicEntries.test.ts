import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '../..');

interface PackageExport {
  types: string;
  import: string;
  require: string;
}

interface PackageManifest {
  exports: Record<string, PackageExport>;
}

const PUBLIC_ENTRIES = {
  '.': 'src/index.ts',
  './viewer': 'src/runtime/viewer/index.ts',
  './interaction': 'src/runtime/interaction/index.ts',
  './web-component': 'src/runtime/webComponent/index.ts',
} as const;

describe('public package entries', () => {
  it('keeps the documented source entry for every package export', () => {
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as PackageManifest;
    expect(Object.keys(manifest.exports).sort()).toEqual(Object.keys(PUBLIC_ENTRIES).sort());

    const missingEntries = Object.values(PUBLIC_ENTRIES).filter(entry => !existsSync(resolve(packageRoot, entry)));
    expect(missingEntries).toEqual([]);
  });

  it('publishes types plus ESM and CommonJS for every entry', () => {
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as PackageManifest;
    const incompleteEntries = Object.entries(manifest.exports)
      .filter(([, entry]) => !entry.types || !entry.import || !entry.require)
      .map(([name]) => name);
    expect(incompleteEntries).toEqual([]);
  });

  it('includes every public source entry in the library build', () => {
    const buildConfig = readFileSync(resolve(packageRoot, 'tsup.config.ts'), 'utf8');
    const missingEntries = Object.values(PUBLIC_ENTRIES).filter(entry => !buildConfig.includes(`'${entry}'`));
    expect(missingEntries).toEqual([]);
  });
});
