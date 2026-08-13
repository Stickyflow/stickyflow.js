// src/features/sfl-language/sfl/adapters/sflToImportJson.ts
//
// Brücke vom SFL-Round-Trip zum bestehenden Import: SFL-Text → die v3-Canvas-JSON-
// Form, die extractEntitiesFromJson / useJsonImport bereits verlustfrei aufs Board
// anwendet (Frames, Groups, Positionen, Links, Styles). So nutzt der SFL-Import die
// battle-tested Entity-Erzeugung, statt sie neu zu bauen.
//
// Grup­pierte Elemente wandern in `layers.groups[].entities`, ungruppierte in
// `canvas.entities`; Frames stets in `canvas.entities.frames`. Style-Strings werden
// zu Objekten dekodiert (Gradient/Mesh/Schatten).

import { sflToCanvasState, type SflEntityOut, type SflLinkOut, type SflGroupOut } from '../sflToCanvasState';
import { decodeColor, decodeShadow, decodeRamp } from './decodeStyles';

const numOf = (s?: string): number | undefined => (s === undefined ? undefined : Number(s));

interface Buckets { notes: any[]; shapes: any[]; links: any[]; }
const emptyBuckets = (): Buckets => ({ notes: [], shapes: [], links: [] });

function shapeObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id,
    type: 'shape',
    text: e.text ?? null,
    shapeType: e.shapeType ?? 'rectangle',
    // §5.5 Symbol - only set when shapeType is 'symbol' (shape: pointed at a
    // Symbol block); passed straight through to Shape.symbol.
    symbol: e.symbol,
    x: e.x, y: e.y, width: e.width, height: e.height, w: e.width, h: e.height,
    rotation: e.rotation ?? 0,
    fillColor: decodeColor(p.fill),
    // decodeColor (not raw passthrough) so a shape stroke can be a gradient too,
    // exactly like fillColor and like a link's stroke — paint() renders the
    // decoded gradient object; a plain hex/rgba/name still passes through verbatim.
    strokeColor: decodeColor(p.stroke),
    strokeWidth: numOf(p.strokeWidth),
    textColor: p.textColor,
    fontSize: numOf(p.fontSize),
    fontWeight: p.fontWeight,
    fontFamily: p.fontFamily,
    textAlign: p.textAlign,
    textVerticalAlign: p.verticalAlign,
    cornerRadius: numOf(p.cornerRadius),
    shadowStyle: decodeShadow(p.shadow),
    dash: p.dash ? safeJson(p.dash) : undefined,
    strokeStyle: p.strokeStyle,
    // buildRenderScene reads element opacity from shapeStyle.opacity, so a bare
    // SFL `opacity: 0.5` has to be threaded into that nested object or it's a
    // no-op (the flat top-level field the renderer never looks at).
    shapeStyle: p.opacity !== undefined ? { opacity: numOf(p.opacity) } : undefined,
    // Maps §3.3: base-layer image (shapeType 'image' only). `src` is generic
    // (not in the entity structural-keys exclusion set), so it already flows
    // through `p` - this gives it a typed home like every other field here.
    imageUrl: p.src,
    imageFit: p.fit as 'cover' | 'contain' | undefined,
    parent_frame_id: e.parentFrameId,
    order: e.order,
  };
}

function frameObject(e: SflEntityOut): any {
  const p = e.props;
  // Unlike shapes (which may legitimately have no fill/stroke at all, see
  // shapeObject), a frame in the app is always created with concrete
  // FRAME_DEFAULTS values — there's no "intentionally unset" state for a
  // frame's own styling. Falling back to those same defaults here (rather
  // than leaving fields undefined) matches that and avoids the title tab
  // crashing on e.g. an undefined font_size.
  return {
    id: e.id,
    type: 'frame',
    title: e.text ?? null,
    x: e.x, y: e.y, width: e.width, height: e.height, w: e.width, h: e.height,
    fill_color: p.fill ?? 'rgba(155, 66, 223, 0.05)',
    stroke_color: p.stroke ?? '#9b42df',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    corner_radius: numOf(p.cornerRadius) ?? 12,
    text_color: p.textColor ?? '#9b42df',
    font_size: numOf(p.fontSize) ?? 14,
    font_weight: p.fontWeight ?? 'bold',
    font_family: p.fontFamily,
    dash: p.dash ? safeJson(p.dash) : undefined,
    // buildFrame only draws the title tab when show_label is truthy (default
    // true when unset). This was never read from SFL at all, so `showLabel:
    // false` silently did nothing — same class of gap as a link's showText.
    show_label: p.showLabel !== 'false',
    order: e.order,
  };
}

function tableObject(e: SflEntityOut): any {
  const p = e.props;
  // Same reasoning as frameObject/swimlaneObject: buildTable's row-height
  // math (computeRowHeight: fontSize * 1.8) needs a real number, and an
  // undefined font_size propagated as NaN into every cell's rendered
  // fontSize, crashing the SVG number formatter. Falling back to
  // TABLE_DEFAULTS keeps a bare `kind: table` block renderable.
  return {
    id: e.id, type: 'table', title: e.text ?? 'Table',
    x: e.x, y: e.y, width: e.width, height: e.height,
    // §3.6 Tables: `Column.scale` is the same "ramp(...)" value-form as
    // Chart.scale (§3.4) - decoded here, at the same adapter boundary
    // chartObject decodes Chart's own `scale` below.
    columns: (e.table?.columns ?? []).map(column => ({ ...column, scale: decodeRamp(column.scale) })),
    rows: e.table?.rows ?? [],
    footer: e.table?.footer,
    show_header: p.showHeader !== 'false',
    row_height: numOf(p.rowHeight),
    header_fill_color: p.headerFill ?? '#f1f5f9', grid_color: p.gridColor ?? '#cbd5e1', grid_width: numOf(p.gridWidth) ?? 1,
    border_style: p.borderStyle ?? 'single', header_rule_style: p.headerRuleStyle ?? 'single', font_family: p.fontFamily ?? 'Inter',
    show_horizontal_lines: p.showHorizontalLines !== 'false', show_vertical_lines: p.showVerticalLines !== 'false',
    fill_color: p.fill ?? '#ffffff', stroke_color: p.stroke ?? '#475569', stroke_width: numOf(p.strokeWidth) ?? 1,
    corner_radius: numOf(p.cornerRadius) ?? 12, text_color: p.textColor ?? '#0f172a',
    font_size: numOf(p.fontSize) ?? 14, font_weight: p.fontWeight ?? 'bold',
    dash: p.dash ? safeJson(p.dash) : undefined, order: e.order,
  };
}

function pathObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id, type: 'path', x: e.x, y: e.y, width: e.width, height: e.height,
    points: e.path?.points ?? [], value: e.path?.value, tension: e.path?.tension ?? 0,
    start_marker: e.path?.startMarker ?? 'none', end_marker: e.path?.endMarker ?? 'none',
    closed: e.path?.closed ?? false, stroke_color: decodeColor(p.stroke) ?? '#7c3aed',
    stroke_width: numOf(p.strokeWidth) ?? 2, dash: p.dash ? safeJson(p.dash) : [],
    opacity: numOf(p.opacity) ?? 1, fill_color: decodeColor(p.fill) ?? 'transparent', order: e.order,
  };
}

function chartObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id, type: 'chart', title: e.text ?? null,
    x: e.x, y: e.y, width: e.width, height: e.height,
    chart_type: e.chart?.chartType ?? 'bar',
    axis_x: e.chart?.axisX ?? { min: 0, max: 4, step: 1 },
    axis_y: e.chart?.axisY ?? { min: 0, max: 500, step: 100 },
    config: {
      categories: e.chart?.categories, areaOpacity: e.chart?.areaOpacity, stacked: e.chart?.stacked,
      // Fields §3.4.
      scale: decodeRamp(e.chart?.scale), interpolate: e.chart?.interpolate,
      idwPower: e.chart?.idwPower, isolines: e.chart?.isolines,
    },
    series: e.chart?.series ?? [],
    rules: (e.chart?.rules ?? []).map(r => ({ id: r.id, at: r.at, text: r.text, color: r.color, stroke_width: r.strokeWidth, dash: r.dash })),
    fill_color: decodeColor(p.fill) ?? '#ffffff', stroke_color: decodeColor(p.stroke) ?? '#475569',
    stroke_width: numOf(p.strokeWidth) ?? 1, corner_radius: numOf(p.cornerRadius) ?? 12,
    grid_color: p.gridColor ?? '#e2e8f0', grid_width: numOf(p.gridWidth) ?? 1,
    text_color: p.textColor ?? '#0f172a', font_size: numOf(p.fontSize) ?? 12,
    font_family: p.fontFamily ?? 'Inter', show_grid: p.showGrid !== 'false',
    show_axis_labels: p.showAxisLabels !== 'false', show_legend: p.showLegend !== 'false', order: e.order,
  };
}

function swimlaneObject(e: SflEntityOut): any {
  const p = e.props;
  // buildSwimlane reads snake_case container fields plus the swimlane-specific
  // orientation/lanes. Sensible fallbacks (mirroring SWIMLANE_DEFAULTS) keep a
  // bare `kind: swimlane` block renderable even when the SFL omits styling.
  return {
    id: e.id,
    type: 'swimlane',
    title: e.text ?? null,
    x: e.x, y: e.y, width: e.width, height: e.height,
    orientation: e.swimlane?.orientation ?? 'horizontal',
    lanes: e.swimlane?.lanes ?? [],
    fill_color: p.fill ?? 'transparent',
    stroke_color: p.stroke ?? '#6b7280',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    corner_radius: numOf(p.cornerRadius) ?? 12,
    dash: p.dash ? safeJson(p.dash) : undefined,
    text_color: p.textColor ?? '#6b7280',
    font_size: numOf(p.fontSize) ?? 22,
    font_weight: p.fontWeight ?? 'bold',
    font_family: p.fontFamily,
    show_lane_labels: p.showLaneLabels !== 'false',
    order: e.order,
  };
}

function linkObject(l: SflLinkOut): any {
  const p = l.props;
  return {
    id: l.id,
    type: 'link',
    from: l.fromId, to: l.toId, fromId: l.fromId, toId: l.toId,
    text: l.text ?? '',
    // buildLink only draws the text label when showText is truthy. The app's
    // own JSON import (useJsonImport.ts) always normalizes this to `true` when
    // absent before anything reaches the renderer; the SFL path bypasses that
    // import step entirely; without this, showText stayed `undefined` and a
    // Link's `text` never rendered at all. `showText: false` in SFL still hides it.
    showText: p.showText !== 'false',
    // Diagrams §3.2 (weighted graphs - network/dependency/call graphs):
    // absent showWeight defaults to true (badge shown whenever weight is
    // set), matching the `stacked: none`/absent convention elsewhere.
    weight: numOf(p.weight),
    showWeight: p.showWeight !== 'false',
    style: {
      pathType: p.route,
      color: decodeColor(p.stroke),
      strokeWidth: numOf(p.strokeWidth),
      strokeStyle: p.strokeStyle,
      opacity: p.opacity !== undefined ? numOf(p.opacity) : undefined,
      fontSize: numOf(p.fontSize),
      fontFamily: p.fontFamily,
      startLabel: p.startLabel,
      endLabel: p.endLabel,
    },
    startMarker: p.markerStart,
    endMarker: p.markerEnd,
    // Was silently lost on read before: `segments:` parses as a `list`
    // SflValue, which the generic string-props map's asString() can't
    // stringify (only string/ident/number) — sflToCanvasState reads it into
    // its own `l.segments` field instead of routing it through `p`.
    segmentOffsets: l.segments,
    // §3.5 Named Ports take precedence over side/offset - the two are
    // mutually exclusive on a resolved endpoint (see sflToCanvasState.ts).
    fromPoint: l.fromPort ? { port: l.fromPort, isPort: true } : l.fromSide ? { side: l.fromSide, offset: l.fromFraction } : undefined,
    toPoint: l.toPort ? { port: l.toPort, isPort: true } : l.toSide ? { side: l.toSide, offset: l.toFraction } : undefined,
    order: l.order,
  };
}

const safeJson = (s: string): any => { try { return JSON.parse(s); } catch { return undefined; } };

export function sflToImportJson(sfl: string): any {
  const state = sflToCanvasState(sfl);

  // id → direkte Group-Zugehörigkeit
  const groupOfEntity = new Map<string, string>();
  const indexGroups = (gs: SflGroupOut[]) => {
    for (const g of gs) { g.entityIds.forEach(id => groupOfEntity.set(id, g.id)); indexGroups(g.subGroups); }
  };
  indexGroups(state.groups);

  // gruppierte Elemente → Group-Buckets, sonst → canvas-Buckets
  const canvas = emptyBuckets();
  const frames: any[] = [];
  const swimlanes: any[] = [];
  const tables: any[] = [];
  const paths: any[] = [];
  const charts: any[] = [];
  const groupBuckets = new Map<string, Buckets>();
  const bucketFor = (id: string): Buckets => {
    const gid = groupOfEntity.get(id);
    if (!gid) return canvas;
    let b = groupBuckets.get(gid);
    if (!b) { b = emptyBuckets(); groupBuckets.set(gid, b); }
    return b;
  };

  // Reihenfolge nach order (Stapel) → der Import vergibt order_keys in Array-Folge
  const ordered = [...state.entities].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const e of ordered) {
    if (e.entityType === 'swimlane') { swimlanes.push(swimlaneObject(e)); continue; }
    if (e.entityType === 'frame') { frames.push(frameObject(e)); continue; }
    if (e.entityType === 'table') { tables.push(tableObject(e)); continue; }
    if (e.entityType === 'path') { paths.push(pathObject(e)); continue; }
    if (e.entityType === 'chart') { charts.push(chartObject(e)); continue; }
    bucketFor(e.id).shapes.push(shapeObject(e));
  }
  // Links tragen kein layout{} und damit kein order_key — ein deklariertes
  // order auf dem Link selbst entscheidet trotzdem ihre Reihenfolge unter-
  // einander (Doku-Reihenfolge als Fallback für Ties/fehlenden Wert), exakt
  // wie oben für Entities: die Array-Position hier bestimmt später den
  // orderOf()-Fallback in buildRenderScene.
  const orderedLinks = [...state.links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const l of orderedLinks) bucketFor(l.id).links.push(linkObject(l));

  // Group-Baum → v3-layers.groups (mit eingebetteten entities)
  const flatGroups: any[] = [];
  const emitGroup = (g: SflGroupOut, parentGroupId?: string) => {
    flatGroups.push({
      id: g.id,
      name: g.name,
      color: g.color,
      icon: g.icon,
      parent_group_id: parentGroupId,
      parent_frame_id: g.parentFrameId,
      entities: groupBuckets.get(g.id) ?? emptyBuckets(),
    });
    for (const sub of g.subGroups) emitGroup(sub, g.id);
  };
  for (const g of state.groups) emitGroup(g);

  return {
    project: { export_type: 'stickyflow_canvas_v3', name: 'SFL Import' },
    canvas: { entities: { notes: [], shapes: canvas.shapes, links: canvas.links, frames, swimlanes, tables, paths, charts } },
    layers: { groups: flatGroups },
    diagnostics: state.diagnostics,
  };
}
