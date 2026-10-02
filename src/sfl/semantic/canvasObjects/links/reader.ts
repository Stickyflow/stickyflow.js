import type { SflBlock } from '../../../ast';
import type { SflEntityOut, SflLinkOut } from '../../types';
import type { CanvasObjectReaderContext } from '../reader';
import { readLinkBlock } from './blockReader';
import type { LinkEndpointReaderContext } from './endpointReader';
import { buildLinkNameIndex } from './nameIndex';

export function readLinks(
  model: SflBlock | undefined,
  linkBlocks: SflBlock[],
  canvasObjects: SflEntityOut[],
  context: CanvasObjectReaderContext,
): SflLinkOut[] {
  const endpointContext: LinkEndpointReaderContext = {
    idByName: buildLinkNameIndex(model),
    canvasObjectById: new Map(canvasObjects.map(canvasObject => [canvasObject.id, canvasObject])),
  };

  return linkBlocks.map(block => readLinkBlock(block, context, endpointContext));
}
