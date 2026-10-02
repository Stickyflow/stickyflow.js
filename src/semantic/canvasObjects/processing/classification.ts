import type { SflBlock, SflValue } from '../../../sfl/ast';
import { asString } from '../../ast/valueAccess';
import type { SflEntityOut } from '../types';

export interface CanvasObjectClassification {
  entityType: SflEntityOut['entityType'];
  kind: string;
  shapeType: string | undefined;
  symbol: SflEntityOut['symbol'];
}

function declaredCanvasObjectKind(block: SflBlock, properties: Map<string, SflValue>): string {
  if (block.kind === 'Table') {
    return 'table';
  }
  if (block.kind === 'Path') {
    return 'path';
  }
  if (block.kind === 'Chart') {
    return 'chart';
  }

  return asString(properties.get('kind')) ?? '';
}

function canvasObjectTypeForKind(kind: string): SflEntityOut['entityType'] {
  if (kind === 'frame') {
    return 'frame';
  }
  if (kind === 'swimlane') {
    return 'swimlane';
  }
  if (kind === 'table') {
    return 'table';
  }
  if (kind === 'path') {
    return 'path';
  }
  if (kind === 'chart') {
    return 'chart';
  }

  return 'shape';
}

export function classifyCanvasObject(
  block: SflBlock,
  properties: Map<string, SflValue>,
  symbolDefinitions: Map<string, NonNullable<SflEntityOut['symbol']>>,
): CanvasObjectClassification {
  const kind = declaredCanvasObjectKind(block, properties);
  const shapeReference = asString(properties.get('shape'));
  const symbol = shapeReference ? symbolDefinitions.get(shapeReference) : undefined;

  return {
    entityType: canvasObjectTypeForKind(kind),
    kind,
    shapeType: symbol ? 'symbol' : shapeReference,
    symbol,
  };
}
