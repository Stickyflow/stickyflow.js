import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');

type CoreLayer = 'model' | 'sfl-language' | 'sfl-semantic' | 'render-input' | 'import-json' | 'render-scene' | 'svg';

const ALLOWED_DEPENDENCIES: Record<CoreLayer, readonly CoreLayer[]> = {
  model: ['model'],
  'sfl-language': ['sfl-language'],
  'sfl-semantic': ['model', 'sfl-language', 'sfl-semantic'],
  'render-input': ['model', 'sfl-language', 'sfl-semantic', 'render-input'],
  'import-json': ['model', 'sfl-language', 'sfl-semantic', 'render-input', 'import-json'],
  'render-scene': ['model', 'render-input', 'render-scene'],
  svg: ['model', 'render-scene', 'svg'],
};

const FORBIDDEN_COLLECTION_DIRECTORIES = new Set(['common', 'helpers', 'misc', 'shared', 'utils']);

function tsFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return tsFiles(fullPath);
    }
    return entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

function directoryNames(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (!entry.isDirectory()) {
      return [];
    }
    const fullPath = join(directory, entry.name);
    return [entry.name, ...directoryNames(fullPath)];
  });
}

function sourcePath(file: string): string {
  return relative(srcDir, file).split('\\').join('/');
}

function sflLayer(path: string): CoreLayer | null {
  if (path === 'sfl/sflToImportJson.ts' || path.startsWith('sfl/importJson/')) {
    return 'import-json';
  }
  if (/^sfl\/(ast|lexer|parser|emitter)\.ts$/.test(path) || path.startsWith('sfl/language/')) {
    return 'sfl-language';
  }
  if (
    path === 'sfl/sflToCanvasState.ts' ||
    path === 'sfl/decodeStyles.ts' ||
    path.startsWith('sfl/semantic/') ||
    path.startsWith('sfl/styleDecoding/')
  ) {
    return 'sfl-semantic';
  }
  return null;
}

function renderingLayer(path: string): CoreLayer | null {
  if (path.startsWith('rendering/svg/')) {
    return 'svg';
  }
  if (path.startsWith('rendering/')) {
    return 'render-scene';
  }
  return null;
}

function coreLayer(path: string): CoreLayer | null {
  if (path.startsWith('model/')) {
    return 'model';
  }
  if (path.startsWith('renderInput/')) {
    return 'render-input';
  }
  return sflLayer(path) ?? renderingLayer(path);
}

function relativeImports(source: string): string[] {
  return [...source.matchAll(/from\s+'(\.[^']*)'/g)].map(match => match[1]);
}

describe('core dependency direction', () => {
  it('only imports explicitly allowed lower-level core layers', () => {
    const offenders: string[] = [];
    for (const file of tsFiles(srcDir)) {
      const from = sourcePath(file);
      const sourceLayer = coreLayer(from);
      if (!sourceLayer) {
        continue;
      }
      for (const specifier of relativeImports(readFileSync(file, 'utf8'))) {
        const target = sourcePath(resolve(dirname(file), specifier));
        const targetLayer = coreLayer(target);
        if (targetLayer && !ALLOWED_DEPENDENCIES[sourceLayer].includes(targetLayer)) {
          offenders.push(`${sourceLayer}: ${from} -> ${targetLayer}: ${target}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the SFL language implementation self-contained', () => {
    const languageDir = join(srcDir, 'sfl/language');
    const offenders: string[] = [];
    for (const file of tsFiles(languageDir)) {
      for (const specifier of relativeImports(readFileSync(file, 'utf8'))) {
        const target = resolve(dirname(file), specifier);
        if (target !== languageDir && !target.startsWith(`${languageDir}${sep}`)) {
          offenders.push(`${sourcePath(file)} -> ${sourcePath(target)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contains no unspecific collection directories', () => {
    const offenders = directoryNames(srcDir).filter(name => FORBIDDEN_COLLECTION_DIRECTORIES.has(name));
    expect(offenders).toEqual([]);
  });

  it('keeps architectural index files free of implementation logic', () => {
    const implementationPattern = /^(?:export\s+)?(?:async\s+)?function\s+|^export\s+(?:class|const|let)\s+/m;
    const architecturalRoots = ['rendering/charts', 'rendering/scene', 'rendering/tables'];
    const offenders = architecturalRoots
      .map(root => join(srcDir, root, 'index.ts'))
      .filter(file => implementationPattern.test(readFileSync(file, 'utf8')))
      .map(sourcePath);
    expect(offenders).toEqual([]);
  });

  it('keeps higher-layer terminology out of model exports', () => {
    const higherLayerExport =
      /^export\s+(?:interface|type|class|const|function)\s+(?:Render|Scene|Svg|Dom)[A-Za-z0-9_]*/m;
    const offenders = tsFiles(join(srcDir, 'model'))
      .filter(file => higherLayerExport.test(readFileSync(file, 'utf8')))
      .map(sourcePath);
    expect(offenders).toEqual([]);
  });

  it('keeps application mutation DTOs out of the model layer', () => {
    const mutationDtoExport = /^export\s+(?:interface|type)\s+[A-Za-z0-9_]+(?:Create|Update)\b/m;
    const offenders = tsFiles(join(srcDir, 'model'))
      .filter(file => mutationDtoExport.test(readFileSync(file, 'utf8')))
      .map(sourcePath);
    expect(offenders).toEqual([]);
  });

  it('keeps source-language metadata out of model contracts', () => {
    const sourceMetadata = /\b(?:columnsBlockName|rowsBlockName|footerBlockName)\b/;
    const offenders = tsFiles(join(srcDir, 'model'))
      .filter(file => sourceMetadata.test(readFileSync(file, 'utf8')))
      .map(sourcePath);
    expect(offenders).toEqual([]);
  });
});
