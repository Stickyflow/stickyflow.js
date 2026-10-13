import type { SflBlock } from '../../../../sflLanguage/ast';
import type { CanvasObjectResolutionContext } from '../../processing/resolver';
import type { SflCanvasObject } from '../../types';
import { readLinkBlock } from './blockReader';
import type { LinkEndpointReaderContext } from './endpointReader';
import { buildLinkNameIndex } from './nameIndex';
import type { SflLinkOut } from './types';

export function readLinks(
  model: SflBlock | undefined,
  linkBlocks: SflBlock[],
  canvasObjects: SflCanvasObject[],
  context: CanvasObjectResolutionContext,
  sourceIndexes: readonly number[] = [],
): SflLinkOut[] {
  const endpointContext: LinkEndpointReaderContext = {
    idByName: buildLinkNameIndex(model),
    canvasObjectById: new Map(canvasObjects.map(canvasObject => [canvasObject.id, canvasObject])),
  };

  return linkBlocks.map((block, index) => ({
    ...readLinkBlock(block, context, endpointContext),
    sourceIndex: sourceIndexes[index],
  }));
}
