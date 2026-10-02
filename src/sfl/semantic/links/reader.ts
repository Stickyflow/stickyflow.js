import type { SflBlock } from '../../ast';
import type { CanvasObjectReaderContext } from '../canvasObjects/reader';
import type { ResolvedCanvasObject, SflLinkOut } from '../types';
import { readLinkBlock } from './blockReader';
import type { LinkEndpointReaderContext } from './endpointReader';
import { buildLinkNameIndex } from './nameIndex';

export function readLinks(
  model: SflBlock | undefined,
  linkBlocks: SflBlock[],
  canvasObjects: ResolvedCanvasObject[],
  context: CanvasObjectReaderContext,
): SflLinkOut[] {
  const endpointContext: LinkEndpointReaderContext = {
    idByName: buildLinkNameIndex(model),
    canvasObjectById: new Map(canvasObjects.map(canvasObject => [canvasObject.id, canvasObject])),
  };

  return linkBlocks.map(block => readLinkBlock(block, context, endpointContext));
}
