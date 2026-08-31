import type { SflBlock, SflValue } from '../ast';
import type { SflEntityOut } from './types';
import { readChart } from './entityReaders/chart';
import { readPath } from './entityReaders/path';
import { readSwimlane } from './entityReaders/swimlane';
import { readTable } from './entityReaders/table';
import { asNumber, asString, childBlocks, directProps, numStr, tupleVals } from './readers';

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

// `kind:` is informational — it names what an entity IS, and does not by
// itself decide anything about rendering (the shape comes from `style`).
// `kind: note` used to be the single exception: a leftover from the text-era
// Note entity, it caused the whole block to be dropped silently, no entity
// and no diagnostic. Notes have not existed for a long time, so all that
// exception did was delete perfectly ordinary boxes — an annotation captioned
// `kind: note` is exactly what a model reaches for, while `kind: annotation`
// one line over survives. Removed: it now builds a shape like every other
// unrecognised kind.
export function buildEntity(
  block: SflBlock,
  origin: { x: number; y: number },
  context: EntityReaderContext,
  frameId?: string,
  positionOverride?: number[],
): SflEntityOut {
  const { mergedProps, layoutProp, symbolDefs } = context;
  const p = mergedProps(block);
  const pos = positionOverride ?? tupleVals(layoutProp(block, 'position')) ?? [0, 0];
  const size = tupleVals(layoutProp(block, 'size')) ?? [0, 0];
  // A `Table` block (§12.1a) carries its kind in the block keyword itself,
  // not a `kind:` property — `Container … { kind: table }` (pre-§12.1a) is
  // still read the same way via the property fallback.
  const kind = block.kind === 'Table' ? 'table' : block.kind === 'Path' ? 'path' : block.kind === 'Chart' ? 'chart' : (asString(p.get('kind')) ?? '');
  const shapeRef = asString(p.get('shape'));
  // §5.5: zeigt `shape:` auf einen Symbol-Block, ist es keine eingebaute
  // Form, sondern eine freie - Geometrie ans Element materialisieren und
  // shapeType auf 'symbol' setzen (wählt den Symbol-Renderer aus).
  const symbol = shapeRef ? symbolDefs.get(shapeRef) : undefined;
  const shapeType = symbol ? 'symbol' : shapeRef;

  // präsentationale Props (alles außer den strukturellen Schlüsseln) als Strings
  const structural = new Set(['id', 'kind', 'text', 'shape', 'parent', 'order', 'orientation', 'lanes']);
  const props: Record<string, string> = {};
  let tableData: SflEntityOut['table'];
  let swimlaneData: SflEntityOut['swimlane'];
  let pathData: SflEntityOut['path'];
  let chartData: SflEntityOut['chart'];
  for (const [k, v] of p) {
    if (structural.has(k)) continue;
    const s = asString(v);
    if (s !== undefined) props[k] = s;
  }
  tableData = readTable(block, p, layoutProp, props);
  swimlaneData = readSwimlane(p);

  pathData = readPath(p, origin);

  chartData = readChart(block, p);

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
    // strukturelle Zugehörigkeit bevorzugt aus Verschachtelung, sonst parent:-Ref
    parentFrameId: frameId ?? asString(p.get('parent')),
    props,
    table: tableData,
    swimlane: swimlaneData,
    path: pathData,
    chart: chartData,
  };
}

