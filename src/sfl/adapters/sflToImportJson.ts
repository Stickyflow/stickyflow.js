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
import { decodeColor, decodeShadow } from './decodeStyles';

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
    x: e.x, y: e.y, width: e.width, height: e.height, w: e.width, h: e.height,
    rotation: e.rotation ?? 0,
    fillColor: decodeColor(p.fill),
    strokeColor: p.stroke,
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
    parent_frame_id: e.parentFrameId,
    order: e.order,
  };
}

function frameObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id,
    type: 'frame',
    title: e.text ?? null,
    x: e.x, y: e.y, width: e.width, height: e.height, w: e.width, h: e.height,
    fill_color: p.fill, stroke_color: p.stroke,
    stroke_width: numOf(p.strokeWidth),
    corner_radius: numOf(p.cornerRadius),
    text_color: p.textColor,
    font_size: numOf(p.fontSize),
    font_weight: p.fontWeight,
    dash: p.dash ? safeJson(p.dash) : undefined,
    order: e.order,
  };
}

function tableObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id, type: 'table', title: e.text ?? 'Table',
    x: e.x, y: e.y, width: e.width, height: e.height,
    columns: e.table?.columns, rows: e.table?.rows,
    show_header: p.showHeader !== 'false',
    row_height: numOf(p.rowHeight),
    header_fill_color: p.headerFill, grid_color: p.gridColor, grid_width: numOf(p.gridWidth),
    border_style: p.borderStyle, header_rule_style: p.headerRuleStyle, font_family: p.fontFamily,
    show_horizontal_lines: p.showHorizontalLines !== 'false', show_vertical_lines: p.showVerticalLines !== 'false',
    fill_color: p.fill, stroke_color: p.stroke, stroke_width: numOf(p.strokeWidth),
    corner_radius: numOf(p.cornerRadius), text_color: p.textColor,
    font_size: numOf(p.fontSize), font_weight: p.fontWeight,
    dash: p.dash ? safeJson(p.dash) : undefined, order: e.order,
  };
}

function linkObject(l: SflLinkOut): any {
  const p = l.props;
  return {
    id: l.id,
    type: 'link',
    from: l.fromId, to: l.toId, fromId: l.fromId, toId: l.toId,
    text: l.text ?? '',
    style: {
      pathType: p.route,
      color: p.stroke,
      strokeWidth: numOf(p.strokeWidth),
    },
    startMarker: p.markerStart,
    endMarker: p.markerEnd,
    segmentOffsets: p.segments ? safeJson(p.segments) : undefined,
    fromPoint: l.fromSide ? { side: l.fromSide, offset: l.fromFraction } : undefined,
    toPoint: l.toSide ? { side: l.toSide, offset: l.toFraction } : undefined,
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
  const tables: any[] = [];
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
    if (e.entityType === 'frame' || e.entityType === 'swimlane') { frames.push(frameObject(e)); continue; }
    if (e.entityType === 'table') { tables.push(tableObject(e)); continue; }
    bucketFor(e.id).shapes.push(shapeObject(e));
  }
  for (const l of state.links) bucketFor(l.id).links.push(linkObject(l));

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
    canvas: { entities: { notes: [], shapes: canvas.shapes, links: canvas.links, frames, tables } },
    layers: { groups: flatGroups },
  };
}
