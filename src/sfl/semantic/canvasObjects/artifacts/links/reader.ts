import type { SflBlock } from '../../../../ast';
import type { CanvasObjectReaderContext } from '../../processing/reader';
import type { SflEntityOut } from '../../types';
import { readLinkBlock } from './blockReader';
import type { LinkEndpointReaderContext } from './endpointReader';
import { buildLinkNameIndex } from './nameIndex';
import type { SflLinkOut } from './types';

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
