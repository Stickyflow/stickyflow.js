// src/features/sfl-language/sfl/sflToCanvasState.ts
//
// Kehrseite von canvasStateToSfl: SFL-1.2-Text → App-nahes Canvas-Modell. Das ist
// das FEHLENDE Bein des Round-Trips (Board → SFL → Board) und damit die
// Existenzberechtigung des Formats: nur wenn diese Rückrichtung strukturell
// verlustfrei UND diff-stabil ist, ist SFL ein Canvas-Format und keine bloße
// Diagramm-Sprache.
//
// Reine Funktion (kein React, keine Seiteneffekte). Sie macht die drei
// Emit-Transformationen rückgängig:
//   • Styles (§9, inkl. Vererbung) → präsentationale Props zurück ans Element.
//   • Relative Positionen (§6.2) → wieder absolut (Frame-/Group-Ursprung addiert).
//   • Verschachtelung → parentFrameId + Group-Zugehörigkeit; Links per Name → id.
//
// Bewusst NICHT enthalten: das Dekodieren von Style-STRINGS zurück in Objekte
// (gradient(...)/mesh(...)/shadow(...) bleiben Strings). Das ist ein späterer
// Schritt; für die strukturelle Round-Trip-Treue genügen die Strings verbatim.

import { parse } from './parser';
import type {
  SflDocument, SflBlock, SflProperty, SflValue, Side,
} from './ast';

export interface SflEntityOut {
  id: string;
  entityType: 'shape' | 'frame' | 'swimlane' | 'table' | 'path' | 'chart';
  kind: string;
  text?: string;
  shapeType?: string;
  // Freie benannte Form (§5.5) - nur gesetzt, wenn `shape:` auf einen
  // Symbol-Block zeigt (shapeType wird dabei auf 'symbol' gesetzt).
  symbol?: { name: string; points: Array<[number, number]>; tension?: number; ports?: Array<{ name: string; at: [number, number] }> };
  x: number; y: number; width: number; height: number;
  rotation?: number;
  order?: number;
  parentFrameId?: string;
  // präsentationale Props als Strings (verbatim aus dem SFL / gemergten Style)
  props: Record<string, string>;
  table?: {
    columns: Array<{
      id: string; label: string; width: number; type: 'text' | 'boolean' | 'number';
      // SFL 1.4, §3.6.
      align?: 'left' | 'center' | 'right';
      // Raw "ramp(...)" string, decoded to a structured ramp at the SFL
      // adapter boundary (sflToImportJson's tableObject) - same split as
      // Chart's own `scale` above.
      scale?: string;
    }>;
    rows: Array<{ id: string; cells: Record<string, string | boolean> }>;
    // §3.6 Footer: at most one summary row, same cell shape as a Row.
    footer?: { id: string; cells: Record<string, string | boolean> };
  };
  swimlane?: {
    orientation: 'horizontal' | 'vertical';
    lanes: Array<{ id: string; label: string; size: number; color?: string }>;
  };
  path?: {
    points: Array<{ x: number; y: number }>;
    tension?: number; startMarker?: string; endMarker?: string; closed?: boolean;
    // Maps §3.3
    value?: number;
  };
  chart?: {
    chartType: 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'field' | 'heatmap' | 'boxplot' | 'sankey' | 'treemap' | 'mekko' | 'hexbin';
    categories?: string[];
    areaOpacity?: number;
    // SFL 1.4, §5.4.1: bar-only, 'none'/absent both mean today's grouped
    // behavior - normalized to undefined so downstream consumers only ever
    // see the three values that actually change computation.
    stacked?: 'true' | 'percent' | 'waterfall';
    // Fields §3.4: `scale` is a raw "ramp(...)" string (parsed at the app
    // edge, like fill/stroke's gradient()/mesh()) - `interpolate`/`idwPower`/
    // `isolines` are structural, same footing as `stacked` above.
    scale?: string;
    interpolate?: 'idw';
    idwPower?: number;
    isolines?: number[];
    // Heatmap only: ordered low->high color bands for axisY.thresholds (one
    // more zone than thresholds).
    zones?: Array<{ label: string; color?: string }>;
    // Boxplot only.
    boxWidth?: number; barCornerRadius?: number; showBoxplotPoints?: boolean;
    barBorderColor?: string; barBorderWidth?: number;
    // Mekko only.
    mekkoVaryHeight?: boolean;
    // Hexbin only: pixel radius of each hexagon cell.
    hexRadius?: number;
    axisX: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
    axisY: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
    series: Array<{ id: string; label: string; color?: string; opacity?: number; values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][]; error?: Array<number | [number, number] | null>; source?: string; target?: string }>;
    // SFL 1.4, §5.4.8
    rules: Array<{ id: string; at: number; text?: string; color?: string; strokeWidth?: number; dash?: number[] }>;
  };
}

export interface SflLinkOut {
  id: string;
  fromId?: string;
  toId?: string;
  text?: string;
  fromSide?: Side; fromFraction?: number;
  toSide?: Side; toFraction?: number;
  // §3.5 Named Ports: set when the endpoint was `entity.portName` and
  // `portName` resolved against the entity's symbol.ports (mutually
  // exclusive with fromSide/toSide above).
  fromPort?: string; toPort?: string;
  order?: number;
  /** Per-segment perpendicular offsets for a manually-adjusted orthogonal
   *  route — absent means "use the router's default bend". */
  segments?: number[];
  props: Record<string, string>;
}

export interface SflGroupOut {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  entityIds: string[];
  subGroups: SflGroupOut[];
  parentFrameId?: string;
}

/**
 * Mirrors `RenderDiagnostic` (src/rendering/renderScene.ts) structurally
 * rather than importing it — `sfl/` has no dependency on `rendering/`, and the
 * two shapes only ever need to line up, never share an identity. Anything
 * pushed here flows straight through sflToImportJson → sflToRenderInput →
 * buildRenderScene's own diagnostics array (seeded from this one) without
 * conversion.
 */
export interface SflDiagnostic {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  entityId?: string;
}

export interface SflCanvasState {
  entities: SflEntityOut[];
  links: SflLinkOut[];
  groups: SflGroupOut[];
  diagnostics: SflDiagnostic[];
}

// ── Wert-Helfer ──────────────────────────────────────────────────────────────

const asString = (v?: SflValue): string | undefined => {
  if (!v) return undefined;
  if (v.type === 'string') return v.value;
  if (v.type === 'ident') return v.segments.join('.');
  if (v.type === 'number') return numStr(v.value);
  return undefined;
};

const asNumber = (v?: SflValue): number | undefined =>
  v && v.type === 'number' ? v.value : undefined;

const tupleVals = (v?: SflValue): number[] | undefined =>
  v && v.type === 'tuple' ? v.values : undefined;

// `segments: [10, 20, 30]` (bracketed) — a `list`, not a `tuple` (§7.1), so
// tupleVals doesn't cover it. asString() also doesn't (only string/ident/
// number), which is why this needed its own reader instead of flowing
// through the generic string-props map like most Link properties.
const listNumbers = (v?: SflValue): number[] | undefined =>
  v && v.type === 'list' ? v.values.flatMap(item => item.type === 'number' ? [item.value] : []) : undefined;

const numStr = (n: number): string => (Number.isInteger(n) ? String(n) : String(n));

// ── Block-Helfer ─────────────────────────────────────────────────────────────

function directProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'property') out.set(e.property.key, e.property.value);
  return out;
}

/** Properties from a block's local `style {}` sub-block (§9.1 override layer). */
function styleSubBlockProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'style') for (const p of e.style.properties) out.set(p.key, p.value);
  return out;
}

/** Properties from a block's local `layout {}` sub-block only (no Layout-ref). */
function localLayoutProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'layout') for (const p of e.layout.properties) out.set(p.key, p.value);
  return out;
}

const childBlocks = (block: SflBlock): SflBlock[] =>
  block.entries.filter(e => e.type === 'block').map(e => (e as any).block as SflBlock);

/** Classifies a block's composition-list refs by target-block kind (§9). */
function classifyRefs(
  composition: string[],
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): { styleRef?: string; layoutRef?: string } {
  let styleRef: string | undefined;
  let layoutRef: string | undefined;
  for (const ref of composition) {
    if (styleBlocks.has(ref)) styleRef = ref;
    else if (layoutBlocks.has(ref)) layoutRef = ref;
  }
  return { styleRef, layoutRef };
}

/**
 * A `: Foo` composition ref that matches neither map degrades completely
 * silently everywhere else in this file (classifyRefs just drops it, and
 * every caller downstream — mergedProps, layoutProp, resolveStyle,
 * resolveLayout — falls through to "nothing referenced" with no error path
 * at all). The most common real cause: a `Style`/`Layout` block declared
 * INSIDE `Model` instead of at the top level alongside it, so it never made
 * it into styleBlocks/layoutBlocks in the first place — every entity that
 * references it then silently gets no shape and no fill/stroke (renders as
 * an invisible box, only its text showing).
 *
 * One dedicated pass over the whole tree, rather than checking inline from
 * classifyRefs' many call sites, so each unresolved ref is reported exactly
 * once per block that uses it, not once per place that happens to resolve it.
 */
function collectUnresolvedRefs(
  doc: SflDocument,
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];
  const visit = (block: SflBlock) => {
    for (const ref of block.composition) {
      if (!styleBlocks.has(ref) && !layoutBlocks.has(ref)) {
        diagnostics.push({
          severity: 'warning',
          code: 'unresolved-style-or-layout',
          entityId: block.name,
          message: `"${ref}" is not a Style or Layout defined at the top level of the document — "${block.name}" gets no shape, fill, or stroke from it.`,
        });
      }
    }
    for (const child of childBlocks(block)) visit(child);
  };
  for (const block of doc.blocks) visit(block);
  return diagnostics;
}

// ── Hauptfunktion ────────────────────────────────────────────────────────────

export function sflToCanvasState(sflText: string): SflCanvasState {
  const doc: SflDocument = parse(sflText);

  // 1) Styles + Layouts sammeln + Vererbungsketten auflösen (Eltern zuerst,
  //    Kind gewinnt). Beide Referenz-Achsen sind unabhängig (§9), teilen aber
  //    denselben flachen Single-Parent-Mechanismus.
  const styleBlocks = new Map<string, SflBlock>();
  const layoutBlocks = new Map<string, SflBlock>();
  // Freie Formen (§5.5): eigener Namensraum, referenziert als Wert von
  // `shape:` (nicht per `:`-Komposition wie Style/Layout).
  const symbolDefs = new Map<string, { name: string; points: Array<[number, number]>; tension?: number; ports?: Array<{ name: string; at: [number, number] }> }>();
  let model: SflBlock | undefined;
  for (const b of doc.blocks) {
    if (b.kind === 'Style') styleBlocks.set(b.name, b);
    else if (b.kind === 'Layout') layoutBlocks.set(b.name, b);
    else if (b.kind === 'Symbol') {
      const symbolProps = directProps(b);
      const pointsValue = symbolProps.get('points');
      const points = pointsValue?.type === 'list'
        ? pointsValue.values.flatMap(item => {
            if (item.type !== 'list' || item.values.length < 2) return [];
            const px = asNumber(item.values[0]);
            const py = asNumber(item.values[1]);
            return px === undefined || py === undefined ? [] : [[px, py] as [number, number]];
          })
        : [];
      // Benannte Anschlüsse (§3.5 Schematics): Port-Kindblöcke, normalisiert
      // wie points. Ein Port ohne gültiges `at:` (z.B. Rundtrip-Rauschen)
      // wird verworfen statt die ganze Symbol-Definition zu verwerfen.
      const ports = childBlocks(b)
        .filter(child => child.kind === 'Port')
        .flatMap(portBlock => {
          const at = tupleVals(directProps(portBlock).get('at'));
          const ax = typeof at?.[0] === 'number' ? at[0] : undefined;
          const ay = typeof at?.[1] === 'number' ? at[1] : undefined;
          return ax === undefined || ay === undefined ? [] : [{ name: portBlock.name, at: [ax, ay] as [number, number] }];
        });
      if (points.length >= 2) symbolDefs.set(b.name, { name: b.name, points, tension: asNumber(symbolProps.get('tension')), ports: ports.length ? ports : undefined });
    }
    else if (b.kind === 'Model' && !model) model = b;
    else if (b.kind === 'Project') {
      for (const inner of childBlocks(b)) if (inner.kind === 'Model' && !model) model = inner;
    }
  }
  const diagnostics = collectUnresolvedRefs(doc, styleBlocks, layoutBlocks);

  const resolvedStyles = new Map<string, Map<string, SflValue>>();
  const resolveStyle = (name: string, seen: Set<string> = new Set()): Map<string, SflValue> => {
    const cached = resolvedStyles.get(name);
    if (cached) return cached;
    const blk = styleBlocks.get(name);
    if (!blk || seen.has(name)) return new Map();
    const merged = new Map<string, SflValue>();
    const { styleRef } = classifyRefs(blk.composition, styleBlocks, layoutBlocks);
    if (styleRef) for (const [k, v] of resolveStyle(styleRef, new Set([...seen, name]))) merged.set(k, v);
    for (const [k, v] of directProps(blk)) merged.set(k, v);
    resolvedStyles.set(name, merged);
    return merged;
  };
  for (const name of styleBlocks.keys()) resolveStyle(name);

  const resolvedLayouts = new Map<string, Map<string, SflValue>>();
  const resolveLayout = (name: string, seen: Set<string> = new Set()): Map<string, SflValue> => {
    const cached = resolvedLayouts.get(name);
    if (cached) return cached;
    const blk = layoutBlocks.get(name);
    if (!blk || seen.has(name)) return new Map();
    const merged = new Map<string, SflValue>();
    const { layoutRef } = classifyRefs(blk.composition, styleBlocks, layoutBlocks);
    if (layoutRef) for (const [k, v] of resolveLayout(layoutRef, new Set([...seen, name]))) merged.set(k, v);
    for (const [k, v] of directProps(blk)) merged.set(k, v);
    resolvedLayouts.set(name, merged);
    return merged;
  };
  for (const name of layoutBlocks.keys()) resolveLayout(name);

  // Merge-Reihenfolge (§9.1): referenzierter Style → direkte Top-Level-Props
  // → lokaler style {} Override zuletzt (gewinnt).
  const mergedProps = (block: SflBlock): Map<string, SflValue> => {
    const merged = new Map<string, SflValue>();
    const { styleRef } = classifyRefs(block.composition, styleBlocks, layoutBlocks);
    if (styleRef && resolvedStyles.has(styleRef)) {
      for (const [k, v] of resolvedStyles.get(styleRef)!) merged.set(k, v);
    }
    for (const [k, v] of directProps(block)) merged.set(k, v);
    for (const [k, v] of styleSubBlockProps(block)) merged.set(k, v);
    return merged;
  };

  // Merge-Reihenfolge für Geometrie: referenzierter Layout-Block → lokaler
  // layout {} Override zuletzt (gewinnt) — spiegelt die Style-Präzedenz.
  const layoutProp = (block: SflBlock, key: string): SflValue | undefined => {
    const local = localLayoutProps(block);
    if (local.has(key)) return local.get(key);
    const { layoutRef } = classifyRefs(block.composition, styleBlocks, layoutBlocks);
    return layoutRef ? resolvedLayouts.get(layoutRef)?.get(key) : undefined;
  };

  const entities: SflEntityOut[] = [];
  const linkBlocks: SflBlock[] = [];
  const groups: SflGroupOut[] = [];

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
  const buildEntity = (block: SflBlock, origin: { x: number; y: number }, frameId?: string, positionOverride?: number[]): SflEntityOut => {
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
    if (kind === 'table') {
      const columnsBlock = childBlocks(block).find(child => child.kind === 'Columns');
      const rowsBlock = childBlocks(block).find(child => child.kind === 'Rows');
      // §3.6: at most one Footer block, sibling of Rows - read with the same
      // cell logic as a Row (shared readCells() below).
      const footerBlock = childBlocks(block).find(child => child.kind === 'Footer');
      if (columnsBlock) {
        const columns: NonNullable<SflEntityOut['table']>['columns'] = childBlocks(columnsBlock).filter(child => child.kind === 'Column').map(column => {
          const columnProps = directProps(column);
          const cellType = asString(columnProps.get('cellType'));
          const align = asString(columnProps.get('align'));
          return {
            id: column.name,
            label: asString(columnProps.get('text')) ?? column.name,
            width: asNumber(columnProps.get('width')) ?? 120,
            type: cellType === 'boolean' ? 'boolean' as const : cellType === 'number' ? 'number' as const : 'text' as const,
            align: align === 'left' || align === 'center' || align === 'right' ? align : undefined,
            scale: asString(columnProps.get('scale')),
          };
        });
        // Shared by Row and Footer: reads one cell per known column, keyed by
        // column id, coercing a boolean-typed column's value to a real
        // boolean (`number`-typed columns stay strings here - parsed to a
        // number only at render time, same as atlas's TableComponent.tsx).
        const readCells = (cellBlock: SflBlock): Record<string, string | boolean> => {
          const cells: Record<string, string | boolean> = {};
          const cellProps = directProps(cellBlock);
          for (const column of columns) {
            const value = asString(cellProps.get(column.id));
            cells[column.id] = column.type === 'boolean' ? value === 'true' : (value ?? '');
          }
          return cells;
        };
        const rows = rowsBlock
          ? childBlocks(rowsBlock).filter(child => child.kind === 'Row').map(row => ({ id: row.name, cells: readCells(row) }))
          : [];
        const footer = footerBlock ? { id: footerBlock.name, cells: readCells(footerBlock) } : undefined;
        tableData = { columns, rows, footer };
      }

      // SFL 1.2 compatibility: accept the old positional nested lists, but
      // the canonical emitter never writes them again.
      const columnsValue = p.get('columns');
      const rowsValue = p.get('rows');
      if (!columnsBlock && columnsValue?.type === 'list') {
        const columns: NonNullable<SflEntityOut['table']>['columns'] = columnsValue.values.flatMap((value, index) => {
          if (value.type !== 'list') return [];
          const label = asString(value.values[0]);
          const width = asNumber(value.values[1]);
          const type = asString(value.values[2]);
          if (label === undefined || width === undefined) return [];
          return [{ id: `col-${index + 1}`, label, width, type: type === 'boolean' ? 'boolean' : 'text' }];
        });
        if (rowsValue?.type === 'list') {
          const rows = rowsValue.values.flatMap((value, rowIndex) => {
            if (value.type !== 'list') return [];
            const cells: Record<string, string | boolean> = {};
            columns.forEach((column, columnIndex) => {
              const cell = value.values[columnIndex];
              cells[column.id] = column.type === 'boolean' ? asString(cell) === 'true' : (asString(cell) ?? '');
            });
            return [{ id: `row-${rowIndex + 1}`, cells }];
          });
          tableData = { columns, rows };
        } else {
          tableData = { columns, rows: [] };
        }
      }
      const rowHeight = asNumber(layoutProp(block, 'rowHeight'));
      if (rowHeight !== undefined) props.rowHeight = numStr(rowHeight);
    }
    if (kind === 'swimlane') {
      // orientation + lanes are the swimlane-specific structural payload the
      // canonical emitter writes (canvasStateToSfl): `orientation: horizontal`
      // and `lanes: [[label, size, color?], …]` as a native nested list. Parse
      // the list into structured lanes so the render pipeline gets real lanes
      // instead of collapsing the whole thing into a plain frame.
      const orientation = asString(p.get('orientation')) === 'vertical' ? 'vertical' : 'horizontal';
      const lanesValue = p.get('lanes');
      const lanes = lanesValue?.type === 'list'
        ? lanesValue.values.flatMap((value, index) => {
            if (value.type !== 'list') return [];
            const label = asString(value.values[0]);
            const size = asNumber(value.values[1]);
            if (label === undefined || size === undefined) return [];
            const color = asString(value.values[2]);
            return [{ id: `lane-${index + 1}`, label, size, ...(color ? { color } : {}) }];
          })
        : [];
      swimlaneData = { orientation, lanes };
    }

    if (kind === 'path') {
      const pointsValue = p.get('points');
      const points = pointsValue?.type === 'list' ? pointsValue.values.flatMap(v => {
        if (v.type !== 'list' || v.values.length < 2) return [];
        const x = asNumber(v.values[0]), y = asNumber(v.values[1]);
        return x !== undefined && y !== undefined ? [{ x: origin.x + x, y: origin.y + y }] : [];
      }) : [];
      pathData = { points, tension: asNumber(p.get('tension')), startMarker: asString(p.get('startMarker')), endMarker: asString(p.get('endMarker')), closed: asString(p.get('closed')) === 'true', value: asNumber(p.get('value')) };
    }

    if (kind === 'chart') {
      const readAxis = (axisBlock: SflBlock | undefined) => {
        const axisProps = axisBlock ? directProps(axisBlock) : new Map<string, SflValue>();
        const thresholdsValue = axisProps.get('thresholds');
        const thresholds = thresholdsValue?.type === 'list'
          ? thresholdsValue.values.flatMap(v => { const n = asNumber(v); return n === undefined ? [] : [n]; })
          : undefined;
        return { min: asNumber(axisProps.get('min')) ?? 0, max: asNumber(axisProps.get('max')) ?? 10, step: asNumber(axisProps.get('step')) ?? 1, label: asString(axisProps.get('label')), unit: asString(axisProps.get('unit')), thresholds: thresholds?.length ? thresholds : undefined };
      };
      const axes = childBlocks(block).filter(child => child.kind === 'Axis');
      const series = childBlocks(block).filter(child => child.kind === 'Series').map(seriesBlock => {
        const seriesProps = directProps(seriesBlock), value = seriesProps.get('values');
        // Component count read from the data itself, not hardcoded to 2:
        // scatter/line use [x,y], Fields §3.4 scalar series use [x,y,value],
        // vector series use [x,y,angle,magnitude].
        const values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][] = [];
        if (value?.type === 'list') for (const item of value.values) {
          if (item.type === 'number') (values as number[]).push(item.value);
          else if (item.type === 'list' && item.values.length >= 2) {
            const components = item.values.map(asNumber);
            if (components.every((c): c is number => c !== undefined)) (values as number[][]).push(components);
          }
        }
        // SFL 1.4, §5.4.5: index-aligned with values. `none` is the per-point
        // "no error bar here" sentinel (mirrors `stacked: none`'s
        // vocabulary) - anything else is a number (symmetric) or a
        // [low, high] list (asymmetric).
        const errorValue = seriesProps.get('error');
        const error = errorValue?.type === 'list'
          ? errorValue.values.map((v): number | [number, number] | null => {
            if (v.type === 'ident' && v.segments.join('.') === 'none') return null;
            if (v.type === 'number') return v.value;
            if (v.type === 'list' && v.values.length >= 2) {
              const lo = asNumber(v.values[0]), hi = asNumber(v.values[1]);
              if (lo !== undefined && hi !== undefined) return [lo, hi];
            }
            return null;
          })
          : undefined;
        return { id: seriesBlock.name, label: asString(seriesProps.get('label')) ?? seriesBlock.name, color: asString(seriesProps.get('color')), opacity: asNumber(seriesProps.get('opacity')), values, error, source: asString(seriesProps.get('source')), target: asString(seriesProps.get('target')) };
      });
      // SFL 1.4, §5.4.8: Chart's second leaf kind alongside Series, at the
      // same depth (§1.2) - read the same way, just a different block kind.
      const rules = childBlocks(block).filter(child => child.kind === 'Rule').map(ruleBlock => {
        const ruleProps = directProps(ruleBlock);
        const dashValue = ruleProps.get('dash');
        const dash = dashValue?.type === 'list' ? dashValue.values.flatMap(v => { const n = asNumber(v); return n === undefined ? [] : [n]; }) : undefined;
        return {
          id: ruleBlock.name,
          at: asNumber(ruleProps.get('at')) ?? 0,
          text: asString(ruleProps.get('text')),
          color: asString(ruleProps.get('color')),
          strokeWidth: asNumber(ruleProps.get('strokeWidth')),
          dash: dash?.length ? dash : undefined,
        };
      });
      const categoriesValue = p.get('categories');
      const categories = categoriesValue?.type === 'list'
        ? categoriesValue.values.flatMap(value => { const category = asString(value); return category === undefined ? [] : [category]; })
        : undefined;
      // SFL 1.4, §5.4.1: 'none'/absent both mean today's grouped behavior -
      // normalized to undefined here so downstream consumers only ever see
      // the three values that actually change computation.
      const stackedValue = asString(p.get('stacked'));
      const isolinesValue = p.get('isolines');
      const isolines = isolinesValue?.type === 'list'
        ? isolinesValue.values.flatMap(v => { const n = asNumber(v); return n === undefined ? [] : [n]; })
        : undefined;
      // Heatmap only: `zones: [["label", "#color"], ...]`, ordered low->high.
      const zonesValue = p.get('zones');
      const zones = zonesValue?.type === 'list'
        ? zonesValue.values.flatMap(v => {
          if (v.type !== 'list' || v.values.length < 1) return [];
          const label = asString(v.values[0]);
          if (label === undefined) return [];
          return [{ label, color: v.values[1] ? asString(v.values[1]) : undefined }];
        })
        : undefined;
      chartData = {
        chartType: (asString(p.get('type')) as 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'field' | 'heatmap' | 'boxplot' | 'sankey' | 'treemap' | 'mekko' | 'hexbin' | undefined) ?? 'bar',
        categories, areaOpacity: asNumber(p.get('areaOpacity')),
        stacked: stackedValue && stackedValue !== 'none' ? (stackedValue as 'true' | 'percent' | 'waterfall') : undefined,
        // Fields §3.4.
        scale: asString(p.get('scale')),
        interpolate: asString(p.get('interpolate')) === 'idw' ? 'idw' : undefined,
        idwPower: asNumber(p.get('idwPower')),
        isolines: isolines?.length ? isolines : undefined,
        zones: zones?.length ? zones : undefined,
        boxWidth: asNumber(p.get('boxWidth')), barCornerRadius: asNumber(p.get('barCornerRadius')),
        showBoxplotPoints: asString(p.get('showBoxplotPoints')) === undefined ? undefined : asString(p.get('showBoxplotPoints')) === 'true',
        barBorderColor: asString(p.get('barBorderColor')), barBorderWidth: asNumber(p.get('barBorderWidth')),
        mekkoVaryHeight: asString(p.get('mekkoVaryHeight')) === undefined ? undefined : asString(p.get('mekkoVaryHeight')) === 'true',
        hexRadius: asNumber(p.get('hexRadius')),
        axisX: readAxis(axes.find(a => a.name === 'x')), axisY: readAxis(axes.find(a => a.name === 'y' || a.name === 'value')),
        series, rules,
      };
    }

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
  };

  // Direkte Entity-/Container-Mitglieder eines Group- oder gruppenartigen
  // Container-Blocks (Subgroups sammeln ihre eigenen Mitglieder selbst).
  const directMemberIds = (block: SflBlock): string[] =>
    childBlocks(block)
      .filter(b => b.kind === 'Entity' || b.kind === 'Container' || b.kind === 'Table' || b.kind === 'Path' || b.kind === 'Chart')
      .map(b => asString(directProps(b).get('id')) ?? b.name);

  // rekursiver Walk: Container (Frame/Swimlane/…, immer mit eigener Position/
  // Größe, §12.1) → eigene visuelle Entity, absteigen mit Entity-Ursprung +
  // frame_id. Group (rein semantisch bzgl. Geometrie, §11: nie eigenes
  // layout{}/Layout-Ref, darf aber Style tragen) → KEINE eigene Entity,
  // transparent für Koordinaten (Kinder bekommen denselben `origin`
  // durchgereicht), nur Name+Style+Mitgliedschaft werden gesammelt.
  const walk = (block: SflBlock, origin: { x: number; y: number }, frameId: string | undefined): SflGroupOut[] => {
    // SFL 1.4 `flow`/`gap` (§12.1, Container-only): auto-positions this
    // block's own DIRECT Container/positioned-leaf children along one axis,
    // a running cursor generalizing what buildSwimlane's lane-offset loop
    // already does for lane bands specifically. Absent/unrecognized `flow`
    // (Model/Group never set it — Groups are geometry-transparent by spec,
    // §11 — and a plain Container without it) means nextFlowPos always
    // returns undefined, i.e. today's fully unchanged explicit-position
    // behavior. A child's own `layout.position` is ignored when this
    // resolves to a real position; `layout.size` stays required/explicit.
    const flowAxis = asString(layoutProp(block, 'flow'));
    const flowGap = asNumber(layoutProp(block, 'gap')) ?? 0;
    let flowCursor = 0;
    const nextFlowPos = (childSize: number[]): number[] | undefined => {
      if (flowAxis !== 'horizontal' && flowAxis !== 'vertical') return undefined;
      const pos = flowAxis === 'horizontal' ? [flowCursor, 0] : [0, flowCursor];
      flowCursor += (flowAxis === 'horizontal' ? childSize[0] : childSize[1]) + flowGap;
      return pos;
    };

    const localGroups: SflGroupOut[] = [];
    for (const child of childBlocks(block)) {
      if (child.kind === 'Container') {
        const childSize = tupleVals(layoutProp(child, 'size')) ?? [0, 0];
        const ent = buildEntity(child, origin, frameId, nextFlowPos(childSize));
        entities.push(ent);
        // Kinder relativ zur absoluten Container-Position; im Container gefundene
        // Groups wandern (flach) in die Ergebnisliste, mit parentFrameId = Container.
        localGroups.push(...walk(child, { x: ent.x, y: ent.y }, ent.id));
      } else if (child.kind === 'Entity' || child.kind === 'Table' || child.kind === 'Path' || child.kind === 'Chart') {
        // Table (§12.1a) is a positioned board member like Entity — never a
        // Container: it never holds further Entities/Groups/Links, so unlike
        // the Container branch above, it doesn't recurse into walk(). Its own
        // Columns/Rows are read separately inside buildEntity.
        const childSize = tupleVals(layoutProp(child, 'size')) ?? [0, 0];
        entities.push(buildEntity(child, origin, frameId, nextFlowPos(childSize)));
      } else if (child.kind === 'Group') {
        const p = mergedProps(child); // Style-Referenz + lokales style{} erlaubt (§11)
        const subGroups = walk(child, origin, frameId); // transparent: kein eigener Ursprung
        localGroups.push({
          id: asString(p.get('id')) ?? child.name,
          name: asString(p.get('text')) ?? child.name,
          color: asString(p.get('color')),
          icon: asString(p.get('icon')),
          entityIds: directMemberIds(child),
          subGroups,
          parentFrameId: frameId ?? asString(p.get('parent')),
        });
      } else if (child.kind === 'Link') {
        linkBlocks.push(child);
      } else if (child.kind === 'Net') {
        // §3.5 Net (Muster C): PARSE-seitig deterministisch in N-1 gewöhnliche
        // Links zerlegt (Sternschema: erstes Mitglied als Hub, alle anderen
        // Mitglieder verbinden sich dorthin) - keine eigene Net-Repräsentation
        // im Canvas-Modell, keine Rück-Emission (siehe ast.ts's BlockKind-
        // Kommentar zu 'Net' für die Begründung). Läuft danach exakt durch
        // dieselbe Endpoint-Auflösung wie ein echter Link-Block.
        const netProps = mergedProps(child);
        const membersValue = netProps.get('members');
        const members = membersValue?.type === 'list'
          ? membersValue.values.flatMap(v => v.type === 'ident' ? [v.segments] : [])
          : [];
        const netText = asString(netProps.get('text'));
        if (members.length >= 2) {
          const hub = members[0];
          for (let i = 1; i < members.length; i++) {
            const entries: SflBlock['entries'] = [
              { type: 'property', property: { key: 'from', value: { type: 'endpoint', segments: hub } } },
              { type: 'property', property: { key: 'to', value: { type: 'endpoint', segments: members[i] } } },
            ];
            if (netText) entries.push({ type: 'property', property: { key: 'text', value: { type: 'string', value: netText, multiline: false } } });
            linkBlocks.push({ kind: 'Link', name: `${child.name}_${i}`, composition: [], entries });
          }
        }
      }
    }
    return localGroups;
  };

  if (model) groups.push(...walk(model, { x: 0, y: 0 }, undefined));

  // 2) Links: Name → id (Namen sind global eindeutig; die id-Property trägt die
  //    UUID). Rekursiv über alle Entity/Container-Blöcke indizieren.
  const idByName = new Map<string, string>();
  const indexNames = (blocks: SflBlock[]) => {
    for (const b of blocks) {
      if (b.kind === 'Entity' || b.kind === 'Container' || b.kind === 'Table' || b.kind === 'Path' || b.kind === 'Chart') {
        idByName.set(b.name, asString(directProps(b).get('id')) ?? b.name);
      }
      indexNames(childBlocks(b));
    }
  };
  if (model) indexNames(childBlocks(model));

  // §3.5 Named Ports: für einen ≥2-Segment-Endpoint-Pfad `entity.portName`
  // gebraucht, um das vorletzte Segment (Entity) von dessen symbol.ports
  // nachzuschlagen. entities ist an dieser Stelle bereits vollständig gebaut.
  const entityById = new Map(entities.map(e => [e.id, e]));

  const links: SflLinkOut[] = linkBlocks.map(lb => {
    const p = mergedProps(lb);
    const fromV = p.get('from');
    const toV = p.get('to');
    const endpoint = (v?: SflValue): { id?: string; side?: Side; fraction?: number; port?: string } => {
      if (!v || v.type !== 'endpoint') return {};
      const last = v.segments[v.segments.length - 1];
      if (v.segments.length >= 2) {
        const entityName = v.segments[v.segments.length - 2];
        const entityId = idByName.get(entityName);
        const entity = entityId ? entityById.get(entityId) : undefined;
        if (entity?.symbol?.ports?.some(port => port.name === last)) {
          return { id: entityId, port: last };
        }
      }
      return { id: idByName.get(last) ?? last, side: v.side, fraction: v.fraction };
    };
    const f = endpoint(fromV);
    const t = endpoint(toV);
    const structural = new Set(['id', 'from', 'to', 'text', 'order', 'segments']);
    const props: Record<string, string> = {};
    for (const [k, v] of p) {
      if (structural.has(k)) continue;
      const s = asString(v);
      if (s !== undefined) props[k] = s;
    }
    return {
      id: asString(p.get('id')) ?? lb.name,
      fromId: f.id, toId: t.id,
      text: asString(p.get('text')),
      fromSide: f.side, fromFraction: f.fraction,
      toSide: t.side, toFraction: t.fraction,
      fromPort: f.port, toPort: t.port,
      order: asNumber(p.get('order')),
      segments: listNumbers(p.get('segments')),
      props,
    };
  });

  return { entities, links, groups, diagnostics };
}
