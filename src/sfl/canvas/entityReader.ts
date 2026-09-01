import type { SflBlock, SflValue } from '../ast';
import { readChart } from './entityReaders/chart';
import { readPath } from './entityReaders/path';
import { readSwimlane } from './entityReaders/swimlane';
import { readTable } from './entityReaders/table';
import type { SflEntityOut } from './types';
import { asNumber, asString, tupleValues } from './valueAccess';

export interface EntityReaderContext {
  mergedProps: (block: SflBlock) => Map<string, SflValue>;
  layoutProp: (block: SflBlock, key: string) => SflValue | undefined;
  symbolDefs: Map<string, NonNullable<SflEntityOut['symbol']>>;
}

const entityTypeOf = (kind: string): SflEntityOut['entityType'] => {
  if (kind === 'frame') return 'frame';
  if (kind === 'swimlane') return 'swimlane';
  if (kind === 'table') return 'table';
  if (kind === 'path') return 'path';
  if (kind === 'chart') return 'chart';
  return 'shape';
};

export function buildEntity(
  block: SflBlock,
  origin: { x: number; y: number },
  context: EntityReaderContext,
  frameId?: string,
  positionOverride?: number[],
): SflEntityOut {
  const { mergedProps, layoutProp, symbolDefs } = context;
  const p = mergedProps(block);
  const pos = positionOverride ?? tupleValues(layoutProp(block, 'position')) ?? [0, 0];
  const size = tupleValues(layoutProp(block, 'size')) ?? [0, 0];
  const kind =
    block.kind === 'Table'
      ? 'table'
      : block.kind === 'Path'
        ? 'path'
        : block.kind === 'Chart'
          ? 'chart'
          : (asString(p.get('kind')) ?? '');
  const shapeRef = asString(p.get('shape'));
  const symbol = shapeRef ? symbolDefs.get(shapeRef) : undefined;
  const shapeType = symbol ? 'symbol' : shapeRef;

  const structural = new Set(['id', 'kind', 'text', 'shape', 'parent', 'order', 'orientation', 'lanes']);
  const props: Record<string, string> = {};
  for (const [k, v] of p) {
    if (structural.has(k)) continue;
    const s = asString(v);
    if (s !== undefined) props[k] = s;
  }
  const tableData = readTable(block, p, layoutProp, props);
  const swimlaneData = readSwimlane(p);

  const pathData = readPath(p, origin);

  const chartData = readChart(block, p);

  return {
    id: asString(p.get('id')) ?? block.name,
    entityType: entityTypeOf(kind),
    kind,
    text: asString(p.get('text')),
    shapeType,
    symbol,
    x: origin.x + (pos[0] ?? 0),
    y: origin.y + (pos[1] ?? 0),
    width: size[0] ?? 0,
    height: size[1] ?? 0,
    rotation: asNumber(layoutProp(block, 'rotation')),
    order: asNumber(layoutProp(block, 'order')),
    parentFrameId: frameId ?? asString(p.get('parent')),
    props,
    table: tableData,
    swimlane: swimlaneData,
    path: pathData,
    chart: chartData,
  };
}
