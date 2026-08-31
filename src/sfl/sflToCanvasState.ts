import { parse } from './parser';
import type { SflCanvasState } from './canvas/types';
export type { SflCanvasState, SflDiagnostic, SflEntityOut, SflGroupOut, SflLinkOut } from './canvas/types';
import { createCanvasResolution } from './canvas/resolution';
import { readCanvasTree } from './canvas/traversal';
import { readLinks } from './canvas/linkReader';

export function sflToCanvasState(source: string): SflCanvasState {
  const doc = parse(source);
  const resolution = createCanvasResolution(doc);
  const { entities, groups, linkBlocks } = readCanvasTree(resolution.model, resolution);
  const links = readLinks(resolution.model, linkBlocks, entities, resolution.entityReaderContext);

  return { entities, groups, links, diagnostics: resolution.diagnostics };
}
