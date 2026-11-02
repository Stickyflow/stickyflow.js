import { isBuiltInComponentType } from '../../../model/component';
import { isComponentBlockKind, type SflBlock, type SflValue } from '../../../sflLanguage/ast';
import { asString } from '../../ast/valueAccess';
import type { SflCanvasObjectType, SflSymbolDefinition } from '../types';

export interface CanvasObjectClassification {
  objectType: SflCanvasObjectType;
  kind: string;
  shapeType: string | undefined;
  symbol: SflSymbolDefinition | undefined;
}

function declaredCanvasObjectKind(block: SflBlock, properties: Map<string, SflValue>): string {
  if (block.kind === 'Screen') {
    return 'screen';
  }
  if (block.kind === 'Path') {
    return 'path';
  }
  if (block.kind === 'Chart') {
    return 'chart';
  }
  if (isComponentBlockKind(block.kind)) {
    return asString(properties.get('type')) ?? 'widget';
  }
  if (block.kind === 'Text') {
    return 'text';
  }
  if (block.kind === 'Image') {
    return 'image';
  }
  if (block.kind === 'Isometric') {
    return 'isometric';
  }
  if (block.kind === 'Dimension') {
    return 'dimension';
  }
  if (block.kind === 'Mesh') {
    return 'mesh';
  }
  if (block.kind === 'Scene') {
    return 'meshScene';
  }
  if (block.kind === 'Canvas') {
    return 'meshSurface';
  }
  if (block.kind === 'Light') {
    return 'meshLight';
  }

  return asString(properties.get('kind')) ?? '';
}

function canvasObjectTypeForKind(kind: string): SflCanvasObjectType {
  if (kind === 'frame' || kind === 'screen') {
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
  if (isBuiltInComponentType(kind)) {
    return 'component';
  }
  if (kind === 'isometric') {
    return 'isometric';
  }
  if (kind === 'dimension') {
    return 'dimension';
  }
  if (kind === 'mesh') {
    return 'mesh';
  }
  if (kind === 'meshScene') {
    return 'meshScene';
  }
  if (kind === 'meshSurface') {
    return 'meshSurface';
  }
  if (kind === 'meshLight') {
    return 'meshLight';
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
    objectType: isComponentBlockKind(block.kind) ? 'component' : canvasObjectTypeForKind(kind),
    kind,
    shapeType: symbol ? 'symbol' : shapeReference,
    symbol,
  };
}
