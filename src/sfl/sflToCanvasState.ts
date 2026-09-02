import { parse } from './parser';
import type { SflCanvasState } from './semantic/types';

export type { SflCanvasState, SflDiagnostic, SflEntityOut, SflGroupOut, SflLinkOut } from './semantic/types';

import { readLinks } from './semantic/linkReader';
import { createCanvasResolution } from './semantic/resolution';
import { readCanvasTree } from './semantic/traversal';

export function sflToCanvasState(source: string): SflCanvasState {
  const doc = parse(source);
  const resolution = createCanvasResolution(doc);
  const { entities, groups, linkBlocks } = readCanvasTree(resolution.model, resolution);
  const links = readLinks(resolution.model, linkBlocks, entities, resolution.entityReaderContext);

  return { entities, groups, links, diagnostics: resolution.diagnostics };
}
