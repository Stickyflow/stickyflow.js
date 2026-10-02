import type { SflBlock } from '../../../../sfl/ast';
import type { CanvasObjectResolutionContext } from '../../processing/resolver';
import type { SflEntityOut } from '../../types';
import { readLinkBlock } from './blockReader';
import type { LinkEndpointReaderContext } from './endpointReader';
import { buildLinkNameIndex } from './nameIndex';
import type { SflLinkOut } from './types';

export function readLinks(
  model: SflBlock | undefined,
  linkBlocks: SflBlock[],
  canvasObjects: SflEntityOut[],
  context: CanvasObjectResolutionContext,
): SflLinkOut[] {
  const endpointContext: LinkEndpointReaderContext = {
    idByName: buildLinkNameIndex(model),
    canvasObjectById: new Map(canvasObjects.map(canvasObject => [canvasObject.id, canvasObject])),
  };

  return linkBlocks.map(block => readLinkBlock(block, context, endpointContext));
}
