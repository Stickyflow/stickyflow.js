import type { SflBlock, SflValue } from '../../../sflLanguage/ast';
import { asString } from '../../ast/valueAccess';
import type { SflCanvasObjectType, SflSymbolDefinition } from '../types';

export interface CanvasObjectClassification {
  objectType: SflCanvasObjectType;
  kind: string;
  shapeType: string | undefined;
  symbol: SflSymbolDefinition | undefined;
}

function declaredCanvasObjectKind(block: SflBlock, properties: Map<string, SflValue>): string {
  if (block.kind === 'Path') {
    return 'path';
  }
  if (block.kind === 'Chart') {
    return 'chart';
  }
  if (block.kind === 'Widget') {
    return asString(properties.get('type')) ?? 'widget';
  }
  if (block.kind === 'Text') {
    return 'text';
  }
  if (block.kind === 'Isometric') {
    return 'isometric';
  }

  return asString(properties.get('kind')) ?? '';
}

function canvasObjectTypeForKind(kind: string): SflCanvasObjectType {
  if (kind === 'frame') {
    return 'frame';
  }
  if (kind === 'swimlane') {
    return 'swimlane';
  }
  if (kind === 'path') {
    return 'path';
  }
  if (kind === 'chart') {
    return 'chart';
  }
  if (kind === 'rollingNumber' || kind === 'tickScale') {
    return 'widget';
  }
  if (kind === 'isometric') {
    return 'isometric';
  }

  return 'shape';
}

export function classifyCanvasObject(
  block: SflBlock,
  properties: Map<string, SflValue>,
  symbolDefinitions: Map<string, SflSymbolDefinition>,
): CanvasObjectClassification {
  const kind = declaredCanvasObjectKind(block, properties);
  const shapeReference = asString(properties.get('shape'));
  const symbol = shapeReference ? symbolDefinitions.get(shapeReference) : undefined;

  return {
    objectType: block.kind === 'Widget' ? 'widget' : canvasObjectTypeForKind(kind),
    kind,
    shapeType: symbol ? 'symbol' : shapeReference,
    symbol,
  };
}
