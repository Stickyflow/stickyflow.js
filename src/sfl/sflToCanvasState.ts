import { parse } from './parser';
import type { SflCanvasState } from './semantic/types';

export type {
  ResolvedCanvasObject,
  ResolvedChartObject,
  ResolvedPathObject,
  ResolvedSwimlaneObject,
  ResolvedTableObject,
  SflCanvasState,
  SflChartEntity,
  SflDiagnostic,
  SflEntityOut,
  SflGroupOut,
  SflLinkOut,
  SflPathEntity,
  SflSwimlaneEntity,
  SflTableEntity,
} from './semantic/types';
export {
  isChartEntity,
  isChartObject,
  isPathEntity,
  isPathObject,
  isSwimlaneEntity,
  isSwimlaneObject,
  isTableEntity,
  isTableObject,
} from './semantic/types';

import { readLinks } from './semantic/links/reader';
import { createCanvasResolution } from './semantic/resolution';
import { readCanvasTree } from './semantic/traversal';

export function sflToCanvasState(source: string): SflCanvasState {
  const doc = parse(source);
  const resolution = createCanvasResolution(doc);
  const { entities, groups, linkBlocks } = readCanvasTree(resolution.model, resolution);
  const links = readLinks(resolution.model, linkBlocks, entities, resolution.canvasObjectReaderContext);

  return { entities, groups, links, diagnostics: resolution.diagnostics };
}
