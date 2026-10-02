import type { SflDocument } from '../../sflLanguage/ast';
import { readLinks } from '../canvasObjects/artifacts/links/reader';
import { resolveCanvasTree } from '../canvasTree/resolver';
import type { SflCanvasState } from '../types';
import { createCanvasResolution } from './resolution';

export function resolveCanvasState(document: SflDocument): SflCanvasState {
  const resolution = createCanvasResolution(document);
  const { canvasObjects, groups, linkBlocks } = resolveCanvasTree(resolution.model, resolution);
  const links = readLinks(resolution.model, linkBlocks, canvasObjects, resolution.canvasObjectResolutionContext);

  return { canvasObjects, groups, links, diagnostics: resolution.diagnostics };
}
