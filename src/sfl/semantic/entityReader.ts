import type { SflBlock, SflValue } from '../ast';
import { classifyEntity } from './entityClassification';
import { readEntityGeometry } from './entityGeometry';
import { readEntityPresentation } from './entityPresentation';
import { readChart } from './entityReaders/chart';
import { readPath } from './entityReaders/path';
import { readSwimlane } from './entityReaders/swimlane';
import { readTable } from './entityReaders/table';
import type { SflEntityOut } from './types';
import { asString } from './valueAccess';

export interface EntityReaderContext {
  mergedProps: (block: SflBlock) => Map<string, SflValue>;
  layoutProp: (block: SflBlock, key: string) => SflValue | undefined;
  symbolDefs: Map<string, NonNullable<SflEntityOut['symbol']>>;
}

export function buildEntity(
  block: SflBlock,
  origin: { x: number; y: number },
  context: EntityReaderContext,
  frameId?: string,
  positionOverride?: number[],
): SflEntityOut {
  const { mergedProps, layoutProp, symbolDefs } = context;
  const properties = mergedProps(block);
  const classification = classifyEntity(block, properties, symbolDefs);
  const geometry = readEntityGeometry(block, origin, layoutProp, positionOverride);
  const presentation = readEntityPresentation(properties);

  return {
    id: asString(properties.get('id')) ?? block.name,
    entityType: classification.entityType,
    kind: classification.kind,
    text: asString(properties.get('text')),
    shapeType: classification.shapeType,
    symbol: classification.symbol,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    rotation: geometry.rotation,
    order: geometry.order,
    parentFrameId: frameId ?? asString(properties.get('parent')),
    props: presentation,
    table: readTable(block, properties, layoutProp, presentation),
    swimlane: readSwimlane(properties),
    path: readPath(properties, origin),
    chart: readChart(block, properties),
  };
}
