import type { SflBlock, SflValue } from '../../../ast';
import { asString } from '../../ast/valueAccess';
import { readChart } from '../artifacts/chart/reader';
import { readPath } from '../artifacts/path/reader';
import { readSwimlane } from '../artifacts/swimlane/reader';
import { readTable } from '../artifacts/table/reader';
import type { SflEntityOut } from '../types';
import { classifyCanvasObject } from './classification';
import { readCanvasObjectGeometry } from './layout/geometry';
import { readCanvasObjectPresentation } from './presentation';

export interface CanvasObjectResolutionContext {
  mergedProps: (block: SflBlock) => Map<string, SflValue>;
  layoutProp: (block: SflBlock, key: string) => SflValue | undefined;
  symbolDefs: Map<string, NonNullable<SflEntityOut['symbol']>>;
}

export function resolveCanvasObject(
  block: SflBlock,
  origin: { x: number; y: number },
  context: CanvasObjectResolutionContext,
  frameId?: string,
  positionOverride?: number[],
): SflEntityOut {
  const { mergedProps, layoutProp, symbolDefs } = context;
  const properties = mergedProps(block);
  const classification = classifyCanvasObject(block, properties, symbolDefs);
  const geometry = readCanvasObjectGeometry(block, origin, layoutProp, positionOverride);
  const presentation = readCanvasObjectPresentation(properties);

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
    chart: readChart(block, properties, symbolDefs, mergedProps),
  };
}
