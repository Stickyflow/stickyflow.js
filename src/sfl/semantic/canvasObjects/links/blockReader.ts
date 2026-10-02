import type { SflBlock } from '../../../ast';
import type { SflLinkOut } from '../../types';
import { asNumber, asString, listNumbers } from '../../valueAccess';
import type { CanvasObjectReaderContext } from '../reader';
import { type LinkEndpointReaderContext, readLinkEndpoint } from './endpointReader';
import { readLinkPresentation } from './presentation';

export function readLinkBlock(
  block: SflBlock,
  canvasObjectContext: CanvasObjectReaderContext,
  endpointContext: LinkEndpointReaderContext,
): SflLinkOut {
  const properties = canvasObjectContext.mergedProps(block);
  const from = readLinkEndpoint(properties.get('from'), endpointContext);
  const to = readLinkEndpoint(properties.get('to'), endpointContext);

  return {
    id: asString(properties.get('id')) ?? block.name,
    fromId: from.id,
    toId: to.id,
    text: asString(properties.get('text')),
    fromSide: from.side,
    fromFraction: from.fraction,
    toSide: to.side,
    toFraction: to.fraction,
    fromPort: from.port,
    toPort: to.port,
    order: asNumber(properties.get('order')),
    segments: listNumbers(properties.get('segments')),
    props: readLinkPresentation(properties),
  };
}
