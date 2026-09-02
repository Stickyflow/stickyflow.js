import type { SflBlock } from '../ast';
import type { EntityReaderContext } from './entityReader';
import { readLinkBlock } from './linkBlockReader';
import type { LinkEndpointReaderContext } from './linkEndpointReader';
import { buildLinkNameIndex } from './linkNameIndex';
import type { SflEntityOut, SflLinkOut } from './types';

export function readLinks(
  model: SflBlock | undefined,
  linkBlocks: SflBlock[],
  entities: SflEntityOut[],
  context: EntityReaderContext,
): SflLinkOut[] {
  const endpointContext: LinkEndpointReaderContext = {
    idByName: buildLinkNameIndex(model),
    entityById: new Map(entities.map(entity => [entity.id, entity])),
  };

  return linkBlocks.map(block => readLinkBlock(block, context, endpointContext));
}
