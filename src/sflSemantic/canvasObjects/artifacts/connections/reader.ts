import type { IsometricFace } from '../../../../model/isometricObject';
import type { SflBlock } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { CanvasObjectResolutionContext } from '../../processing/resolver';
import type { SflCanvasObject } from '../../types';
import { readLinkEndpoint } from '../links/endpointReader';
import { buildLinkNameIndex } from '../links/nameIndex';
import { readLinkPresentation } from '../links/presentation';
import type { SflConnectionOut } from './types';

const FACES: ReadonlySet<string> = new Set(['top', 'bottom', 'front', 'back', 'left', 'right']);

function readFace(value: string | undefined): IsometricFace {
  return value !== undefined && FACES.has(value) ? (value as IsometricFace) : 'front';
}

export function readConnections(
  model: SflBlock | undefined,
  connectionBlocks: SflBlock[],
  canvasObjects: SflCanvasObject[],
  context: CanvasObjectResolutionContext,
): SflConnectionOut[] {
  const endpointContext = {
    idByName: buildLinkNameIndex(model),
    canvasObjectById: new Map(canvasObjects.map(canvasObject => [canvasObject.id, canvasObject])),
  };
  return connectionBlocks.map(block => {
    const properties = context.mergedProps(block);
    return {
      id: asString(properties.get('id')) ?? block.name,
      fromId: readLinkEndpoint(properties.get('from'), endpointContext).id,
      toId: readLinkEndpoint(properties.get('to'), endpointContext).id,
      fromFace: readFace(asString(properties.get('fromFace'))),
      toFace: readFace(asString(properties.get('toFace'))),
      order: asNumber(properties.get('order')),
      props: readLinkPresentation(properties),
    };
  });
}
