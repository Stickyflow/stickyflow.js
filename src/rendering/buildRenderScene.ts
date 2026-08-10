import type { GradientColorObject, MeshGradientObject, Shape } from '../model/shapes';
import { SHAPE_DEFAULTS } from '../model/shapes';
import type { Frame } from '../model/frames';
import type { Link, MarkerType } from '../model/links';
import { getLinkStrokeColor } from '../model/links';
import type { Swimlane } from '../model/swimlanes';
import { computeRowHeight, type Table } from '../model/tables';
import type { FreeformPath, PathPoint } from '../model/paths';
import type { Chart, ChartAxis } from '../model/charts';
import { tableBorderGeometry } from '../model/geometry/tables';
import { localShapePath } from '../model/geometry/shapes';
import { wrapText } from '../model/geometry/text';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash, roundedOrthogonalPathData } from '../model/geometry/connectionLine';
import type { PathSegment } from '../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene, SceneRole,
  ScenePaint, ScenePath, SceneStyle, SceneText,
} from './renderScene';

// Interactive DOM contract (ADR-03): stamp every node of an owner with a shared
// role + id so the viewer can map any sub-node (text, divider, cell) back to its
// entity. The first (primary) node is always marked sfPrimary — unconditionally,
// not just when an ariaLabel happens to be given (a title-less frame/table or a
// swimlane, which never gets one, still needs a single node the viewer can paint
// a selection indicator onto) — and additionally becomes focusable when a label
// is available.
function tag(nodes: RenderNode[], sfRole: SceneRole, sfId: string, sfKind?: string, ariaLabel?: string): RenderNode[] {
  nodes.forEach((node, index) => {
    node.sfRole = sfRole;
    node.sfId = sfId;
    if (sfKind) node.sfKind = sfKind;
    if (index === 0) {
      node.sfPrimary = true;
      if (ariaLabel) node.ariaLabel = ariaLabel;
    }
  });
  return nodes;
}

const DEFAULT_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const EMPTY_BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const orderOf = (entity: { order_key?: string; orderKey?: string; order?: number }, fallback: number): number => {
  const key = entity.order_key ?? entity.orderKey;
  if (!key && typeof entity.order === 'number') return entity.order;
  if (!key) return fallback;
  let rank = 0;
  for (let i = 0; i < Math.min(key.length, 8); i++) rank = rank * 128 + key.charCodeAt(i);
  return rank;
};

const boxBounds = (x: number, y: number, width: number, height: number, extra = 0): Bounds => ({
  minX: x - extra, minY: y - extra, maxX: x + width + extra, maxY: y + height + extra,
});

function rotatedBounds(x: number, y: number, width: number, height: number, degrees: number, extra = 0): Bounds {
  if (!degrees) return boxBounds(x, y, width, height, extra);
  const cx = x + width / 2, cy = y + height / 2;
  const angle = degrees * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const corners = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  const rotated = corners.map(([px, py]) => ({
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos,
  }));
  return {
    minX: Math.min(...rotated.map(p => p.x)) - extra,
    minY: Math.min(...rotated.map(p => p.y)) - extra,
    maxX: Math.max(...rotated.map(p => p.x)) + extra,
    maxY: Math.max(...rotated.map(p => p.y)) + extra,
  };
}

function paint(value: string | GradientColorObject | MeshGradientObject | null | undefined, diagnostics: RenderDiagnostic[], entityId: string): ScenePaint {
  if (!value) return { kind: 'none' };
  if (typeof value === 'string') return { kind: 'solid', color: value };
  if (value.type === 'gradient') {
    return { kind: 'linear-gradient', angle: value.angle, stops: value.stops.map(s => ({ offset: s.position, color: s.color })) };
  }
  if (!value.points.length) {
    diagnostics.push({ severity: 'warning', code: 'empty-mesh-gradient', entityId, message: 'Mesh gradient has no color points.' });
    return { kind: 'none' };
  }
  return {
    kind: 'mesh-gradient',
    points: value.points.map(point => ({ x: point.x, y: point.y, color: point.color })),
  };
}

function shapeStyle(shape: Shape, diagnostics: RenderDiagnostic[]): SceneStyle {
  const defaults = SHAPE_DEFAULTS[shape.shapeType];
  const strokeWidth = finite(shape.strokeWidth, defaults.strokeWidth);
  const dotted = shape.strokeStyle === 'dotted';
  const dash = shape.shapeType === 'container_rectangle'
    ? [10, 5]
    : dotted ? [0.001, strokeWidth * 2]
      : shape.strokeStyle === 'dashed' ? [strokeWidth * 4, strokeWidth * 2]
        : shape.dash;
  const shadow = shape.shadowStyle ?? (shape.hasShadow ? { enabled: true, color: '#000000', opacity: 0.25, blur: 10, angle: 45, distance: 5 } : undefined);
  const angle = finite(shadow?.angle, 45) * Math.PI / 180;
  return {
    // No SHAPE_DEFAULTS fallback here: the interactive canvas (Konva) leaves an
    // unset fillColor/strokeColor as `undefined`, rendering no paint at all —
    // paint() already returns { kind: 'none' } for a falsy value. Substituting
    // a default color here (as this used to) diverges from the canvas: an
    // entity with no fill set would render opaque white instead of transparent.
    fill: paint(shape.fillColor, diagnostics, shape.id),
    stroke: paint(shape.strokeColor, diagnostics, shape.id),
    strokeWidth,
    dash: dash?.length ? dash : undefined,
    lineCap: dotted ? 'round' : 'butt',
    opacity: finite(shape.shapeStyle?.opacity, 1),
    shadow: shadow?.enabled ? {
      color: shadow.color, opacity: finite(shadow.opacity, 0.25), blur: finite(shadow.blur, 10),
      dx: Math.cos(angle) * finite(shadow.distance, 5), dy: Math.sin(angle) * finite(shadow.distance, 5),
    } : undefined,
  };
}

function buildShape(shape: Shape, index: number, diagnostics: RenderDiagnostic[]): RenderNode[] {
  if (shape.is_visible === false) return [];
  const x = finite(shape.x, 0), y = finite(shape.y, 0), width = Math.max(0, finite(shape.width, 100)), height = Math.max(0, finite(shape.height, 100));
  const rotation = finite(shape.rotation, 0), strokeWidth = finite(shape.strokeWidth, 2);
  const bounds = rotatedBounds(x, y, width, height, rotation, strokeWidth + (shape.hasShadow ? 20 : 2));
  // Fallback band below links' (see buildLink): connectors and their markers
  // should paint on top of the shapes they touch, matching how virtually every
  // diagramming tool draws connector arrowheads — visible, not tucked under
  // the shape's fill. SFL never actually sets order_key today (see note at
  // buildLink), so this fallback is what determines stacking in practice.
  const style = shapeStyle(shape, diagnostics), order = orderOf(shape, 10_000 + index);
  const nodes: RenderNode[] = [];
  const base = { id: `shape-${shape.id}`, order, bounds, rotation, style };
  const path = localShapePath(shape.shapeType, x, y, width, height);

  if (path) nodes.push({ ...base, type: 'path', d: path, rotationCenter: { x: x + width / 2, y: y + height / 2 } });
  else if (shape.shapeType === 'circle' || shape.shapeType === 'oval') {
    nodes.push({ ...base, type: 'ellipse', cx: x + width / 2, cy: y + height / 2, rx: width / 2, ry: height / 2 });
  } else if (shape.shapeType === 'cylinder') {
    const cap = height * .15;
    nodes.push({ ...base, id: `${base.id}-body`, type: 'rect', x, y: y + cap, width, height: height - cap * 2 });
    nodes.push({ ...base, id: `${base.id}-top`, type: 'ellipse', cx: x + width / 2, cy: y + cap, rx: width / 2, ry: cap });
    nodes.push({ ...base, id: `${base.id}-bottom`, type: 'ellipse', cx: x + width / 2, cy: y + height - cap, rx: width / 2, ry: cap });
  } else if (shape.shapeType === 'person') {
    const r = Math.min(width, height), head = r * .3, body = r * .5, cx = x + width / 2;
    nodes.push({ ...base, id: `${base.id}-head`, type: 'ellipse', cx, cy: y + head, rx: head, ry: head });
    nodes.push({ ...base, id: `${base.id}-body`, type: 'path', d: `M ${cx - body} ${y + 2 * head + body} A ${body} ${body} 0 0 1 ${cx + body} ${y + 2 * head + body} L ${cx} ${y + 2 * head + body} Z`, rotationCenter: { x: x + width / 2, y: y + height / 2 } });
  } else {
    const rx = shape.shapeType === 'pill' ? Math.min(width, height) / 2
      : shape.shapeType === 'rounded_rectangle' ? finite(shape.cornerRadius, 8) : 0;
    nodes.push({ ...base, type: 'rect', x, y, width, height, rx });
  }

  if (shape.text) {
    const fontSize = finite(shape.fontSize, SHAPE_DEFAULTS[shape.shapeType].fontSize);
    const padding = Math.max(8, strokeWidth * 2);
    nodes.push({
      type: 'text', id: `shape-text-${shape.id}`, order: order + .5, bounds,
      x: x + padding, y: y + padding, width: Math.max(0, width - padding * 2), height: Math.max(0, height - padding * 2),
      lines: wrapText(shape.text, Math.max(0, width - padding * 2), fontSize),
      fontFamily: shape.fontFamily || DEFAULT_FONT, fontSize,
      fontWeight: shape.fontWeight ?? 'normal', color: shape.textColor || '#111827',
      align: shape.textAlign ?? 'center', verticalAlign: shape.textVerticalAlign ?? 'middle',
      lineHeight: finite(shape.lineHeight, 1.3), rotation, rotationCenter: { x: x + width / 2, y: y + height / 2 },
    });
  }
  return nodes;
}

function simpleContainerStyle(fill: string, stroke: string, strokeWidth: number, dash?: number[]): SceneStyle {
  return { fill: { kind: 'solid', color: fill || 'transparent' }, stroke: { kind: 'solid', color: stroke }, strokeWidth, dash: dash?.length ? dash : undefined };
}

// SVG <rect rx="…"> only rounds all four corners uniformly. A table header
// fill sits flush against the row grid below it — its bottom edge is an
// internal seam, not an outer boundary — so rounding it too makes the fill's
// rounded bottom corners peek out past the header/row divider line. The real
// canvas app avoids this with Konva's per-corner cornerRadius array
// ([topLeft, topRight, 0, 0]); SVG has no equivalent rect attribute, so this
// draws the same shape as an explicit path instead.
function topRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} V ${y + height} H ${x} Z`;
}

// Register-tab title shared by frames and swimlanes (both are containers with
// the same "title tab above the top-left corner" presentation) instead of
// placing plain title text inside the body. Caller supplies explicit ids so
// each container keeps its own existing id scheme.
function titleTabNodes(
  tabId: string, titleId: string, x: number, y: number, cornerRadius: number, title: string,
  tabColor: string, fontFamily: string | undefined, fontSize: number, fontWeight: 'normal' | 'bold', order: number,
): RenderNode[] {
  const tabHeight = Math.max(32, fontSize + 18);
  const tabPadding = 16;
  const tabWidth = Math.max(120, title.length * fontSize * .62 + tabPadding * 2);
  const tabX = x + Math.max(12, cornerRadius);
  const tabY = y - tabHeight;
  const tabBounds = boxBounds(tabX, tabY, tabWidth, tabHeight, 6);
  return [
    {
      type: 'rect', id: tabId, order: order + .1, bounds: tabBounds,
      x: tabX, y: tabY, width: tabWidth, height: tabHeight, rx: 8,
      style: {
        fill: { kind: 'solid', color: tabColor }, stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: .1, blur: 4, dx: 0, dy: 2 },
      },
    },
    {
      type: 'text', id: titleId, order: order + .2, bounds: tabBounds,
      x: tabX + tabPadding, y: tabY, width: Math.max(0, tabWidth - tabPadding * 2), height: tabHeight,
      lines: [title], fontFamily: fontFamily ?? DEFAULT_FONT, fontSize,
      fontWeight, color: '#ffffff', align: 'left', verticalAlign: 'middle', lineHeight: 1.2,
    },
  ];
}

function buildFrame(frame: Frame, index: number): RenderNode[] {
  if (frame.is_visible === false) return [];
  const order = orderOf(frame, index);
  const bodyBounds = boxBounds(frame.x, frame.y, frame.width, frame.height, frame.stroke_width + 4);
  const nodes: RenderNode[] = [{ type: 'rect', id: `frame-${frame.id}`, order, bounds: bodyBounds, x: frame.x, y: frame.y, width: frame.width, height: frame.height, rx: frame.corner_radius, style: simpleContainerStyle(frame.fill_color, frame.stroke_color, frame.stroke_width, frame.dash) }];
  if ((frame.show_label ?? true) && frame.title) {
    nodes.push(...titleTabNodes(`frame-tab-${frame.id}`, `frame-title-${frame.id}`, frame.x, frame.y, frame.corner_radius, frame.title, frame.stroke_color, frame.font_family, frame.font_size, frame.font_weight, order));
  }
  return nodes;
}

function buildSwimlane(swimlane: Swimlane, index: number): RenderNode[] {
  if (swimlane.is_visible === false) return [];
  const order = orderOf(swimlane, 5_000 + index), bounds = boxBounds(swimlane.x, swimlane.y, swimlane.width, swimlane.height, swimlane.stroke_width + 4);
  const style = simpleContainerStyle(swimlane.fill_color, swimlane.stroke_color, swimlane.stroke_width, swimlane.dash);
  // Unlike Frame, a swimlane never gets a title tab — the per-lane labels
  // already identify each row, so an outer title would be redundant (matches
  // the real canvas app's SwimlaneComponent.tsx, which explicitly has none).
  // swimlane.title is real data (round-trips through SFL) but is not drawn.
  const nodes: RenderNode[] = [{ type: 'rect', id: `swimlane-${swimlane.id}`, order, bounds, x: swimlane.x, y: swimlane.y, width: swimlane.width, height: swimlane.height, rx: swimlane.corner_radius, style }];
  // Scale lane sizes to sum exactly to the swimlane's own perpendicular
  // dimension (height for horizontal, width for vertical) before laying out
  // dividers/labels. The real canvas app enforces this on every resize (see
  // laneScaling.ts's scaleLanesToSize) so it's never violated there — but
  // nothing enforced it for SFL-declared lanes. A mismatch (hand-written or
  // LLM-generated SFL where the sizes don't add up to the declared width/
  // height — not a hypothetical: this is the "chatbot" case the format is
  // for) meant the cursor-based layout below drifted past the swimlane's own
  // bounds, which are computed from width/height alone; the far dividers and
  // labels then fell outside the scene's viewBox and were silently clipped
  // instead of the lanes simply being (harmlessly) proportioned to fit.
  const targetSize = swimlane.orientation === 'horizontal' ? swimlane.height : swimlane.width;
  const laneTotal = swimlane.lanes.reduce((sum, lane) => sum + lane.size, 0);
  const lanes = laneTotal > 0 && targetSize > 0
    ? swimlane.lanes.map(lane => ({ ...lane, size: lane.size * (targetSize / laneTotal) }))
    : swimlane.lanes;
  let cursor = 0;
  lanes.slice(0, -1).forEach((lane, laneIndex) => {
    cursor += lane.size;
    const d = swimlane.orientation === 'horizontal'
      ? `M ${swimlane.x} ${swimlane.y + cursor} H ${swimlane.x + swimlane.width}`
      : `M ${swimlane.x + cursor} ${swimlane.y} V ${swimlane.y + swimlane.height}`;
    nodes.push({ type: 'path', id: `swimlane-divider-${swimlane.id}-${laneIndex}`, order: order + .1 + laneIndex / 100, bounds, d, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: swimlane.stroke_color }, strokeWidth: swimlane.stroke_width } });
  });
  if (swimlane.show_lane_labels) {
    cursor = 0;
    const fontSize = swimlane.font_size;
    lanes.forEach((lane, laneIndex) => {
      const horizontal = swimlane.orientation === 'horizontal';
      const base = { id: `swimlane-label-${swimlane.id}-${lane.id}`, order: order + .5 + laneIndex / 100, fontFamily: swimlane.font_family ?? DEFAULT_FONT, fontSize, fontWeight: swimlane.font_weight, color: swimlane.text_color, lineHeight: 1.2 } as const;
      if (horizontal) {
        // A horizontal-orientation lane is a wide, short strip (full width,
        // thin height) — plain horizontal text would compete with shapes for
        // that limited height. Rotate -90° to read bottom-to-top along the
        // lane's left edge instead, the conventional swimlane/pool-header
        // treatment (matches the real canvas app's SwimlaneComponent.tsx).
        // Single line, not wrapped: a lane label is normally one short word,
        // and wrapping it to fit the lane's own (often small) height as the
        // available width can force several short lines whose total height
        // exceeds the lane and bleeds into the neighboring lane's label —
        // worse than an occasional long label overflowing past the edge.
        //
        // Bounds must be the ROTATED box, not the shared swimlane `bounds`:
        // this text's "width" (its reading length) runs along the swimlane's
        // Y axis after rotation, which the swimlane's own un-rotated bounds
        // never accounted for — the SVG viewBox then clipped the label at
        // both ends (no font-metrics system exists yet to size this exactly,
        // see ADR-01, so estimated text width plus a safety margin here,
        // rather than an exact fit, is what keeps it from clipping). Bold
        // text in particular renders visibly wider than the .58-factor
        // estimate other text uses (see wrapText). Kept modest: the declared
        // `width` below is already generous (lane.size - 16, well over the
        // typical label's estimated need), so this margin only has to cover
        // estimate error, not the label's whole footprint — a large margin
        // here inflates the scene's overall bounds for every swimlane, most
        // of which don't need it, shrinking the visible diagram when fit
        // into a fixed-size box.
        const thickness = fontSize * 1.4;
        const cx = swimlane.x + 10 + thickness / 2, cy = swimlane.y + cursor + lane.size / 2;
        const width = Math.max(20, lane.size - 16);
        const labelBounds = rotatedBounds(cx - width / 2, cy - thickness / 2, width, thickness, -90, 12);
        nodes.push({
          ...base, type: 'text', bounds: labelBounds, x: cx - width / 2, y: cy - thickness / 2, width, height: thickness, lines: [lane.label],
          align: 'center', verticalAlign: 'middle', rotation: -90, rotationCenter: { x: cx, y: cy },
        });
      } else {
        const x = swimlane.x + cursor + 8, y = swimlane.y + 8;
        const width = Math.max(0, lane.size - 16), height = Math.max(0, swimlane.height - 16);
        nodes.push({ ...base, type: 'text', bounds, x, y, width, height, lines: [lane.label], align: 'left', verticalAlign: 'top' });
      }
      cursor += lane.size;
    });
  }
  return nodes;
}

function buildTable(table: Table, index: number): RenderNode[] {
  if (table.is_visible === false) return [];
  const order = orderOf(table, 7_000 + index);
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size);
  const headerHeight = table.show_header ? rowHeight : 0;
  const height = headerHeight + table.rows.length * rowHeight;
  const { doubleBorderGap, gridInset } = tableBorderGeometry(table);
  const bounds = boxBounds(table.x, table.y, table.width, height, table.stroke_width + 4);
  const nodes: RenderNode[] = [{
    type: 'rect', id: `table-${table.id}`, order, bounds,
    x: table.x, y: table.y, width: table.width, height, rx: table.corner_radius,
    style: simpleContainerStyle(table.fill_color, 'transparent', 0, []),
  }];
  if (table.show_header) nodes.push({
    type: 'path', id: `table-header-fill-${table.id}`, order: order + .06, bounds,
    d: topRoundedRectPath(table.x, table.y, table.width, rowHeight, table.corner_radius),
    style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
  });
  // Scale column widths to sum exactly to the table's own declared width —
  // same fix, same reasoning as buildSwimlane's lane scaling: the real app
  // guarantees this on every resize (see columnScaling.ts's
  // scaleColumnsToWidth), so it's never violated there, but nothing enforced
  // it for SFL-declared columns. Without it, a mismatch left dividers/cells
  // past the table's own bounds (built from table.width alone), clipped by
  // the scene's viewBox instead of the columns being harmlessly proportioned.
  const columnTotal = table.columns.reduce((sum, column) => sum + column.width, 0);
  const columns = columnTotal > 0
    ? table.columns.map(column => ({ ...column, width: column.width * (table.width / columnTotal) }))
    : table.columns;
  let columnX = table.x;
  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0 && (table.show_vertical_lines ?? true)) nodes.push({
      type: 'path', id: `table-column-${table.id}-${column.id}`, order: order + .1, bounds,
      d: `M ${columnX} ${table.y + gridInset} V ${table.y + height - gridInset}`,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
    });
    if (table.show_header) nodes.push({
      type: 'text', id: `table-header-${table.id}-${column.id}`, order: order + .2, bounds,
      x: columnX + 6, y: table.y, width: Math.max(0, column.width - 12), height: rowHeight,
      lines: [column.label], fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size,
      fontWeight: table.font_weight, color: table.text_color, align: 'left', verticalAlign: 'middle', lineHeight: 1.2,
    });
    table.rows.forEach((row, rowIndex) => {
      const value = row.cells[column.id];
      nodes.push({
        type: 'text', id: `table-cell-${table.id}-${row.id}-${column.id}`, order: order + .3, bounds,
        x: columnX + 6, y: table.y + headerHeight + rowIndex * rowHeight,
        width: Math.max(0, column.width - 12), height: rowHeight,
        lines: [String(value ?? '')],
        fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size, fontWeight: 'normal',
        color: table.text_color, align: 'left', verticalAlign: 'middle', lineHeight: 1.2,
      });
    });
    columnX += column.width;
  });
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const y = table.y + headerHeight + rowIndex * rowHeight;
    const showRule = rowIndex === 0 && table.show_header
      ? table.header_rule_style !== 'none'
      : (table.show_horizontal_lines ?? true);
    if (y > table.y && showRule) nodes.push({
      type: 'path', id: `table-row-${table.id}-${rowIndex}`, order: order + .1, bounds,
      d: `M ${table.x + gridInset} ${y} H ${table.x + table.width - gridInset}`,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
    });
    if (rowIndex === 0 && table.show_header && table.header_rule_style === 'double') nodes.push({
      type: 'path', id: `table-row-double-${table.id}`, order: order + .1, bounds,
      d: `M ${table.x + gridInset} ${y - 4} H ${table.x + table.width - gridInset}`,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
    });
  }
  if (table.border_style !== 'none') nodes.push({
    type: 'rect', id: `table-border-${table.id}`, order: order + .4, bounds,
    x: table.x, y: table.y, width: table.width, height, rx: table.corner_radius,
    style: simpleContainerStyle('transparent', table.stroke_color, table.stroke_width, table.dash),
  });
  if (table.border_style === 'double') nodes.push({
    type: 'rect', id: `table-inner-border-${table.id}`, order: order + .41, bounds,
    x: table.x + doubleBorderGap, y: table.y + doubleBorderGap, width: table.width - doubleBorderGap * 2, height: height - doubleBorderGap * 2, rx: Math.max(0, table.corner_radius - doubleBorderGap),
    style: simpleContainerStyle('transparent', table.stroke_color, table.stroke_width, []),
  });
  return nodes;
}

function freeformPathData(points: PathPoint[], tension: number, closed: boolean): string {
  if (!points.length) return '';
  if (points.length < 3 || tension <= 0) {
    return `M ${points[0].x} ${points[0].y} ${points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ')}${closed ? ' Z' : ''}`;
  }
  const pointAt = (index: number): PathPoint => closed
    ? points[(index + points.length) % points.length]
    : points[Math.max(0, Math.min(points.length - 1, index))];
  const segmentCount = closed ? points.length : points.length - 1;
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < segmentCount; i++) {
    const p0 = pointAt(i - 1), p1 = pointAt(i), p2 = pointAt(i + 1), p3 = pointAt(i + 2);
    const factor = tension / 6;
    commands.push(`C ${p1.x + (p2.x - p0.x) * factor} ${p1.y + (p2.y - p0.y) * factor} ${p2.x - (p3.x - p1.x) * factor} ${p2.y - (p3.y - p1.y) * factor} ${p2.x} ${p2.y}`);
  }
  if (closed) commands.push('Z');
  return commands.join(' ');
}

function buildFreeformPath(path: FreeformPath, index: number): RenderNode[] {
  if (path.is_visible === false || path.points.length < 2) return [];
  const strokeWidth = finite(path.stroke_width, 2);
  const extra = strokeWidth + 12;
  const bounds = {
    minX: Math.min(...path.points.map(point => point.x)) - extra,
    minY: Math.min(...path.points.map(point => point.y)) - extra,
    maxX: Math.max(...path.points.map(point => point.x)) + extra,
    maxY: Math.max(...path.points.map(point => point.y)) + extra,
  };
  return [{
    type: 'path', id: `path-${path.id}`, order: orderOf(path, 30_000 + index), bounds,
    d: freeformPathData(path.points, finite(path.tension, 0), path.closed === true),
    markerStart: path.start_marker, markerEnd: path.end_marker,
    style: {
      fill: path.closed ? { kind: 'solid', color: path.fill_color ?? 'transparent' } : { kind: 'none' },
      stroke: { kind: 'solid', color: path.stroke_color ?? '#7c3aed' }, strokeWidth,
      dash: path.dash?.length ? path.dash : undefined, lineCap: 'round', lineJoin: 'round', opacity: finite(path.opacity, 1),
    },
  }];
}

const CHART_COLORS = ['#7c3aed', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#eab308'];
const mapChartValue = (value: number, axis: ChartAxis, extent: number): number => axis.max === axis.min ? 0 : (value - axis.min) / (axis.max - axis.min) * extent;
function chartTicks(axis: ChartAxis): number[] {
  if (!(axis.step > 0)) return axis.min === axis.max ? [axis.min] : [axis.min, axis.max];
  const ticks: number[] = [];
  for (let value = axis.min; value <= axis.max + 1e-9 && ticks.length < 1000; value += axis.step) ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}

function chartText(id: string, order: number, bounds: Bounds, x: number, y: number, width: number, height: number, text: string, chart: Chart, align: 'left' | 'center' | 'right' = 'left', rotation?: number): SceneText {
  return { type: 'text', id, order, bounds, x, y, width, height, lines: [text], fontFamily: chart.font_family ?? DEFAULT_FONT, fontSize: Math.max(9, finite(chart.font_size, 12)), fontWeight: 'normal', color: chart.text_color ?? '#0f172a', align, verticalAlign: 'top', lineHeight: 1.2, rotation, rotationCenter: rotation ? { x, y } : undefined };
}

// SFL 1.4, §5.4.5: a series' raw error entry (symmetric number or asymmetric
// [low, high] pair) resolved against its point's own value into an absolute
// [low, high] range on the value axis.
function errorBarRange(value: number, error: number | [number, number]): [number, number] {
  return Array.isArray(error) ? [value - error[0], value + error[1]] : [value - error, value + error];
}

const ERROR_CAP_HALF = 5;

// One whisker (main line + two end caps), centered on a fixed pixel position
// `center` along the category axis (always X - this package's bar chart has
// no horizontal-orientation flag), between two Y pixel positions.
function errorWhiskerNode(id: string, order: number, bounds: Bounds, center: number, y1: number, y2: number, color: string): RenderNode {
  const d = `M ${center} ${y1} L ${center} ${y2} M ${center - ERROR_CAP_HALF} ${y1} L ${center + ERROR_CAP_HALF} ${y1} M ${center - ERROR_CAP_HALF} ${y2} L ${center + ERROR_CAP_HALF} ${y2}`;
  return { type: 'path', id, order, bounds, d, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 1 } };
}

// SFL 1.4, §5.4.1: cumulative per-category segment [pixelStart, pixelEnd]
// (in plot-height pixel terms, 0 = axis_y.min) for one series at one
// category - 'waterfall' runs each series independently (its own floating
// baseline); 'true'/'percent' combine all series at a category.
function stackedSegment(chart: Chart, mode: 'true' | 'percent' | 'waterfall', categoryIndex: number, seriesIndex: number, plotHeight: number): { value: number; pixelStart: number; pixelEnd: number } {
  const value = (chart.series[seriesIndex].values as number[])[categoryIndex] ?? 0;
  if (mode === 'waterfall') {
    let running = 0;
    for (let i = 0; i < categoryIndex; i++) running += (chart.series[seriesIndex].values as number[])[i] ?? 0;
    return { value, pixelStart: mapChartValue(running, chart.axis_y, plotHeight), pixelEnd: mapChartValue(running + value, chart.axis_y, plotHeight) };
  }
  if (mode === 'percent') {
    const total = chart.series.reduce((sum, s) => sum + Math.abs((s.values as number[])[categoryIndex] ?? 0), 0) || 1;
    let cum = 0;
    for (let i = 0; i < seriesIndex; i++) cum += Math.abs((chart.series[i].values as number[])[categoryIndex] ?? 0);
    const magnitude = Math.abs(value);
    return { value, pixelStart: (cum / total) * plotHeight, pixelEnd: ((cum + magnitude) / total) * plotHeight };
  }
  let cum = 0;
  for (let i = 0; i < seriesIndex; i++) cum += (chart.series[i].values as number[])[categoryIndex] ?? 0;
  return { value, pixelStart: mapChartValue(cum, chart.axis_y, plotHeight), pixelEnd: mapChartValue(cum + value, chart.axis_y, plotHeight) };
}

// SFL 1.4, §5.4.8: reference lines (`Rule`) - a second addressable leaf
// alongside Series, drawn on top of the chart's marks. Always axis_y (the
// value axis), full line across the plot - `presentation: bullet`'s short
// target-tick variant doesn't exist in this package (no `presentation`
// config at all yet).
function buildChartRules(chart: Chart, plot: { x: number; y: number; width: number; height: number }, bounds: Bounds, order: number): RenderNode[] {
  const rules = chart.rules;
  if (!rules?.length) return [];
  const nodes: RenderNode[] = [];
  let offset = 0;
  const fontSize = Math.max(9, finite(chart.font_size, 12) - 2);
  rules.forEach(rule => {
    const color = rule.color || chart.stroke_color || '#475569';
    const y = plot.y + plot.height - mapChartValue(rule.at, chart.axis_y, plot.height);
    nodes.push({ type: 'path', id: `chart-rule-${chart.id}-${rule.id}`, order: order + offset++, bounds, d: `M ${plot.x} ${y} L ${plot.x + plot.width} ${y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: rule.stroke_width ?? 1, dash: rule.dash } });
    if (rule.text) nodes.push(chartText(`chart-rule-label-${chart.id}-${rule.id}`, order + offset++, bounds, plot.x + 4, y - fontSize - 2, 160, fontSize + 2, rule.text, chart));
  });
  return nodes;
}

function buildChart(chart: Chart, index: number): RenderNode[] {
  if (chart.is_visible === false) return [];
  const order = orderOf(chart, 20_000 + index), bounds = boxBounds(chart.x, chart.y, chart.width, chart.height, finite(chart.stroke_width, 1) + 2);
  const showLabels = chart.show_axis_labels !== false, showLegend = chart.show_legend !== false;
  const padLeft = showLabels ? (chart.axis_y.label ? 60 : 46) : 12;
  const padBottom = showLabels ? (chart.axis_x.label ? 52 : 34) : 12;
  const padTop = chart.title || (showLegend && chart.series.length) ? 44 : 24;
  const plot = { x: chart.x + padLeft, y: chart.y + padTop, width: Math.max(1, chart.width - padLeft - 24), height: Math.max(1, chart.height - padTop - padBottom) };
  const nodes: RenderNode[] = [{ type: 'rect', id: `chart-${chart.id}`, order, bounds, x: chart.x, y: chart.y, width: chart.width, height: chart.height, rx: chart.corner_radius ?? 12, style: { fill: { kind: 'solid', color: chart.fill_color ?? '#ffffff' }, stroke: { kind: 'solid', color: chart.stroke_color ?? '#475569' }, strokeWidth: finite(chart.stroke_width, 1) } }];
  let offset = .01;
  if (chart.title) nodes.push({ ...chartText(`chart-title-${chart.id}`, order + offset++, bounds, plot.x, chart.y + 12, plot.width, 20, chart.title, chart), fontWeight: 'bold', fontSize: Math.max(10, finite(chart.font_size, 12)) + 2 });
  if (showLegend) {
    let x = plot.x + plot.width;
    [...chart.series].reverse().forEach((series, reverseIndex) => {
      const seriesIndex = chart.series.length - 1 - reverseIndex, width = Math.max(42, series.label.length * finite(chart.font_size, 12) * .58 + 22);
      x -= width;
      nodes.push({ type: 'rect', id: `chart-legend-swatch-${chart.id}-${series.id}`, order: order + offset++, bounds, x, y: chart.y + 16, width: 10, height: 10, rx: 3, style: { fill: { kind: 'solid', color: series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length] } } });
      nodes.push(chartText(`chart-legend-${chart.id}-${series.id}`, order + offset++, bounds, x + 15, chart.y + 13, width - 15, 18, series.label, chart));
    });
  }
  if (chart.chart_type === 'radar' || chart.chart_type === 'radial') {
    const circular = chart.chart_type === 'radial';
    const areaOpacity = Math.max(0, Math.min(1, chart.config?.areaOpacity ?? .16));
    const configured = chart.config?.categories?.filter(Boolean) ?? [];
    const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
    const categoryCount = Math.max(3, configured.length || dataCount);
    const defaults = ['Speed', 'Quality', 'Cost', 'Reliability', 'Usability'];
    const categories = Array.from({ length: categoryCount }, (_, categoryIndex) => configured[categoryIndex] ?? defaults[categoryIndex] ?? `Category ${categoryIndex + 1}`);
    const cx = plot.x + plot.width / 2, cy = plot.y + plot.height / 2;
    const labelSpace = Math.max(38, finite(chart.font_size, 12) * 3.2);
    const radius = Math.max(8, Math.min(plot.width, plot.height) / 2 - labelSpace);
    const range = chart.axis_y.max - chart.axis_y.min;
    const radial = (value: number) => (range === 0 ? 0 : Math.max(0, Math.min(1, (value - chart.axis_y.min) / range))) * radius;
    const point = (pointRadius: number, pointIndex: number) => {
      const angle = -Math.PI / 2 + pointIndex * Math.PI * 2 / categoryCount;
      return { x: cx + Math.cos(angle) * pointRadius, y: cy + Math.sin(angle) * pointRadius };
    };
    const polygon = (pointRadius: number) => `M ${Array.from({ length: categoryCount }, (_, pointIndex) => { const p = point(pointRadius, pointIndex); return `${pointIndex ? 'L ' : ''}${p.x} ${p.y}`; }).join(' ')} Z`;
    if (chart.show_grid !== false) {
      chartTicks(chart.axis_y).filter(tick => tick > chart.axis_y.min).forEach(tick => {
        const ringRadius = radial(tick);
        nodes.push(circular
          ? { type: 'ellipse', id: `chart-radial-ring-${chart.id}-${tick}`, order: order + offset++, bounds, cx, cy, rx: ringRadius, ry: ringRadius, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } }
          : { type: 'path', id: `chart-radar-ring-${chart.id}-${tick}`, order: order + offset++, bounds, d: polygon(ringRadius), style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
      });
      categories.forEach((_, categoryIndex) => { const edge = point(radius, categoryIndex); nodes.push({ type: 'path', id: `chart-radar-spoke-${chart.id}-${categoryIndex}`, order: order + offset++, bounds, d: `M ${cx} ${cy} L ${edge.x} ${edge.y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } }); });
    }
    if (showLabels) categories.forEach((category, categoryIndex) => {
      const labelPoint = point(radius + 10, categoryIndex), dx = labelPoint.x - cx, width = Math.max(64, Math.min(120, plot.width / 3));
      nodes.push(chartText(`chart-radar-label-${chart.id}-${categoryIndex}`, order + offset++, bounds, labelPoint.x - (dx > 8 ? 0 : dx < -8 ? width : width / 2), labelPoint.y - 6, width, 30, category, chart, dx > 8 ? 'left' : dx < -8 ? 'right' : 'center'));
    });
    chart.series.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length], values = series.values as number[];
      const seriesPoints = categories.map((_, categoryIndex) => point(radial(values[categoryIndex] ?? chart.axis_y.min), categoryIndex));
      const seriesPath = circular ? freeformPathData(seriesPoints, .5, true) : `M ${seriesPoints.map((seriesPoint, pointIndex) => `${pointIndex ? 'L ' : ''}${seriesPoint.x} ${seriesPoint.y}`).join(' ')} Z`;
      nodes.push({ type: 'path', id: `chart-radar-fill-${chart.id}-${series.id}`, order: order + offset++, bounds, d: seriesPath, style: { fill: { kind: 'solid', color }, stroke: { kind: 'none' }, opacity: Math.max(0, Math.min(1, series.opacity ?? areaOpacity)) } });
      nodes.push({ type: 'path', id: `chart-radar-series-${chart.id}-${series.id}`, order: order + offset++, bounds, d: seriesPath, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 2, lineJoin: 'round' } });
      seriesPoints.forEach((seriesPoint, pointIndex) => nodes.push({ type: 'ellipse', id: `chart-radar-point-${chart.id}-${series.id}-${pointIndex}`, order: order + offset++, bounds, cx: seriesPoint.x, cy: seriesPoint.y, rx: 3, ry: 3, style: { fill: { kind: 'solid', color } } }));
    });
    return nodes;
  }
  if (chart.show_grid !== false) {
    const gridStyle: SceneStyle = { fill: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' } }, gridWidth = finite(chart.grid_width, 1);
    chartTicks(chart.axis_x).forEach(tick => { const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width); nodes.push({ type: 'rect', id: `chart-grid-x-${chart.id}-${tick}`, order: order + offset++, bounds, x: x - gridWidth / 2, y: plot.y, width: gridWidth, height: plot.height, style: gridStyle }); });
    chartTicks(chart.axis_y).forEach(tick => { const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height); nodes.push({ type: 'rect', id: `chart-grid-y-${chart.id}-${tick}`, order: order + offset++, bounds, x: plot.x, y: y - gridWidth / 2, width: plot.width, height: gridWidth, style: gridStyle }); });
  }
  // SFL 1.4, §5.4.1: bar-only. sflToCanvasState already normalizes 'none' to
  // undefined, but the Chart type itself still allows 'none' (a hand-built
  // RenderInput, bypassing the SFL pipeline, could set it explicitly).
  const stackedMode = chart.config?.stacked && chart.config.stacked !== 'none' ? chart.config.stacked : undefined;
  if (chart.chart_type === 'bar' && stackedMode) {
    const count = Math.max(1, ...chart.series.map(item => item.values.length)), slot = plot.width / count, barWidth = Math.max(1, slot - 8);
    for (let i = 0; i < count; i++) {
      chart.series.forEach((series, seriesIndex) => {
        const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
        const seg = stackedSegment(chart, stackedMode, i, seriesIndex, plot.height);
        const y = plot.y + plot.height - Math.max(seg.pixelStart, seg.pixelEnd);
        const height = Math.max(1, Math.abs(seg.pixelEnd - seg.pixelStart));
        const x = plot.x + i * slot + 4;
        nodes.push({ type: 'rect', id: `chart-bar-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, x, y, width: barWidth, height, rx: 2, style: { fill: { kind: 'solid', color } } });
      });
    }
  } else {
    chart.series.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
      const pairs = explicit ? series.values as [number, number][] : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
      if (chart.chart_type === 'bar') {
        const count = Math.max(1, ...chart.series.map(item => item.values.length)), slot = plot.width / count, barWidth = Math.max(1, (slot - 8) / Math.max(1, chart.series.length));
        series.values.forEach((value, i) => {
          const yValue = Array.isArray(value) ? value[1] : value;
          const height = Math.max(0, mapChartValue(yValue, chart.axis_y, plot.height));
          const x = plot.x + i * slot + 4 + seriesIndex * barWidth, width = Math.max(1, barWidth - 2);
          nodes.push({ type: 'rect', id: `chart-bar-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, x, y: plot.y + plot.height - height, width, height, rx: 2, style: { fill: { kind: 'solid', color } } });
          const err = series.error?.[i];
          if (err != null) {
            const [lo, hi] = errorBarRange(yValue, err);
            nodes.push(errorWhiskerNode(`chart-bar-error-${chart.id}-${series.id}-${i}`, order + offset++, bounds, x + width / 2,
              plot.y + plot.height - mapChartValue(lo, chart.axis_y, plot.height), plot.y + plot.height - mapChartValue(hi, chart.axis_y, plot.height), '#000000'));
          }
        });
      } else {
        const pixels = pairs.map(([x, y]) => ({ x: plot.x + mapChartValue(x, chart.axis_x, plot.width), y: plot.y + plot.height - mapChartValue(y, chart.axis_y, plot.height) }));
        if (chart.chart_type === 'line' && pixels.length) nodes.push({ type: 'path', id: `chart-line-${chart.id}-${series.id}`, order: order + offset++, bounds, d: `M ${pixels.map((point, i) => `${i ? 'L' : ''} ${point.x} ${point.y}`).join(' ')}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 2, lineJoin: 'round' } });
        pixels.forEach((point, i) => {
          const err = chart.chart_type === 'line' ? series.error?.[i] : undefined;
          if (err != null) {
            const [lo, hi] = errorBarRange(pairs[i][1], err);
            nodes.push(errorWhiskerNode(`chart-line-error-${chart.id}-${series.id}-${i}`, order + offset++, bounds, point.x,
              plot.y + plot.height - mapChartValue(lo, chart.axis_y, plot.height), plot.y + plot.height - mapChartValue(hi, chart.axis_y, plot.height), color));
          }
          nodes.push({ type: 'ellipse', id: `chart-point-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, cx: point.x, cy: point.y, rx: chart.chart_type === 'scatter' ? 4 : 3, ry: chart.chart_type === 'scatter' ? 4 : 3, style: { fill: { kind: 'solid', color } } });
        });
      }
    });
  }
  const ruleNodes = buildChartRules(chart, plot, bounds, order + offset);
  nodes.push(...ruleNodes); offset += ruleNodes.length;
  if (showLabels) {
    chartTicks(chart.axis_x).forEach(tick => { const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width); nodes.push(chartText(`chart-x-tick-${chart.id}-${tick}`, order + offset++, bounds, x - 20, plot.y + plot.height + 4, 40, 18, String(tick), chart, 'center')); });
    chartTicks(chart.axis_y).forEach(tick => { const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height); nodes.push(chartText(`chart-y-tick-${chart.id}-${tick}`, order + offset++, bounds, chart.x, y - 6, padLeft - 8, 18, String(tick), chart, 'right')); });
    if (chart.axis_x.label) nodes.push(chartText(`chart-x-label-${chart.id}`, order + offset++, bounds, plot.x, chart.y + chart.height - 18, plot.width, 18, chart.axis_x.label, chart, 'center'));
    if (chart.axis_y.label) nodes.push(chartText(`chart-y-label-${chart.id}`, order + offset++, bounds, chart.x + 12, plot.y + plot.height, plot.height, 18, chart.axis_y.label, chart, 'center', -90));
  }
  return nodes;
}

function marker(link: Link, end: 'start' | 'end'): MarkerType {
  const explicit = end === 'start' ? (link.startMarker ?? link.start_marker) : (link.endMarker ?? link.end_marker);
  if (explicit) return explicit;
  const direction = link.style?.arrowDirection ?? 'forward';
  if (direction === 'bidirectional') return 'arrow';
  if (end === 'start' && direction === 'backward') return 'arrow';
  if (end === 'end' && direction === 'forward') return 'arrow';
  return 'none';
}

function pathData(points: number[], pathType: string, segments: PathSegment[], strokeWidth: number): string {
  if (points.length < 4) return '';
  if (pathType === 'curved' && points.length >= 8) return `M ${points[0]} ${points[1]} C ${points[2]} ${points[3]} ${points[4]} ${points[5]} ${points[6]} ${points[7]}`;
  if (pathType === 'orthogonal' && segments.length) {
    return roundedOrthogonalPathData(segments, Math.max(16, strokeWidth * 4));
  }
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`;
  return d;
}

function endpointLabelPosition(points: number[], end: 'start' | 'end') {
  const index = end === 'start' ? 0 : points.length - 2;
  const neighbor = end === 'start' ? 2 : points.length - 4;
  const x = points[index], y = points[index + 1];
  const dx = points[neighbor] - x, dy = points[neighbor + 1] - y;
  const length = Math.hypot(dx, dy) || 1, ux = dx / length, uy = dy / length;
  return { x: x + ux * 20 - uy * 13, y: y + uy * 20 + ux * 13 };
}

function buildLink(item: RenderInput['links'][number], index: number): RenderNode[] {
  const { link, from, to } = item;
  if (link.is_visible === false || link.isVisible === false) return [];
  const pathType = link.style?.pathType ?? 'orthogonal';
  const { points, segments } = getPathPoints(link, from, to, pathType);
  const midpoint = getLineMidpoint(points, pathType, from, to);
  const strokeWidth = finite(link.style?.strokeWidth, 2), extra = strokeWidth + 14;
  const xs = points.filter((_, i) => i % 2 === 0), ys = points.filter((_, i) => i % 2 === 1);
  const bounds = { minX: Math.min(...xs) - extra, minY: Math.min(...ys) - extra, maxX: Math.max(...xs) + extra, maxY: Math.max(...ys) + extra };
  const color = getLinkStrokeColor(link.style?.color) || '#64748b';

  const hasLabel = !!(link.showText && link.text);
  const fontSize = finite(link.style?.fontSize, 10);
  const labelWidth = Math.min(250, Math.max(fontSize * 2, (link.text?.length ?? 0) * fontSize * .65 + 10));
  const wrappedLines = hasLabel ? wrapText(link.text!, labelWidth, fontSize) : [];
  const labelHeight = wrappedLines.length * fontSize * 1.4;

  const contentDash = getDashArray(strokeWidth, link.style?.strokeStyle ?? 'solid');
  // A line-style dash pattern (dashed/dotted) and a label-gap dash pattern
  // can't both live in the one `stroke-dasharray` a path has — narrow,
  // documented tradeoff: a dashed/dotted link with a label keeps the older
  // "line runs through the label" look rather than interleaving two patterns.
  const gap = hasLabel && !contentDash ? labelGapDash(points, pathType, labelWidth, labelHeight) : null;
  // The third value only needs to outlast the path — it lets the dash pattern
  // draw solid from the gap to the end without ever reaching a second cycle.
  const dash = gap ? [gap.dashBefore, gap.gapLength, 1e6] : contentDash;

  const style: SceneStyle = { fill: { kind: 'none' }, stroke: typeof link.style?.color === 'object' && link.style.color.type === 'gradient' ? { kind: 'linear-gradient', angle: 0, stops: link.style.color.stops.map(s => ({ offset: s.position, color: s.color })) } : { kind: 'solid', color }, strokeWidth, dash, lineCap: 'round', lineJoin: 'round', opacity: finite(link.style?.opacity, 1) };
  // Fallback band above shapes' (see buildShape): connectors and their end
  // markers should paint on top of the shapes they connect, not underneath.
  const order = orderOf(link, 20_000 + index);
  const path: ScenePath = {
    type: 'path', id: `link-${link.id}`, order, bounds, d: pathData(points, pathType, segments, strokeWidth), style,
    markerStart: marker(link, 'start'), markerEnd: marker(link, 'end'),
    sfFromId: link.fromId, sfToId: link.toId, sfRoute: pathType,
    sfFromSide: link.fromPoint && 'side' in link.fromPoint ? link.fromPoint.side : undefined,
    sfToSide: link.toPoint && 'side' in link.toPoint ? link.toPoint.side : undefined,
    sfLabelGap: !!gap,
  };
  const nodes: RenderNode[] = [path];
  if (hasLabel) {
    nodes.push({ type: 'text', id: `link-text-${link.id}`, order: order + .5, bounds, x: midpoint.x - labelWidth / 2, y: midpoint.y - fontSize, width: labelWidth, height: fontSize * 2, lines: wrappedLines, fontFamily: link.style?.fontFamily ?? DEFAULT_FONT, fontSize, fontWeight: 'normal', color, align: 'center', verticalAlign: 'middle', lineHeight: 1.4 });
  }
  const endpointFontSize = finite(link.style?.fontSize, 10);
  (['start', 'end'] as const).forEach((end, labelIndex) => {
    const label = (end === 'start' ? link.style?.startLabel : link.style?.endLabel)?.trim();
    if (!label) return;
    const position = endpointLabelPosition(points, end), width = 90;
    nodes.push({ type: 'text', id: `link-${end}-label-${link.id}`, order: order + .55 + labelIndex * .01, bounds,
      x: position.x - width / 2, y: position.y - endpointFontSize, width, height: endpointFontSize * 2,
      lines: [label], fontFamily: link.style?.fontFamily ?? DEFAULT_FONT, fontSize: endpointFontSize,
      fontWeight: 'normal', color, align: 'center', verticalAlign: 'middle', lineHeight: 1.4 });
  });
  return nodes;
}

function sceneBounds(nodes: RenderNode[]): Bounds {
  if (!nodes.length) return EMPTY_BOUNDS;
  return { minX: Math.min(...nodes.map(n => n.bounds.minX)), minY: Math.min(...nodes.map(n => n.bounds.minY)), maxX: Math.max(...nodes.map(n => n.bounds.maxX)), maxY: Math.max(...nodes.map(n => n.bounds.maxY)) };
}

export function buildRenderScene(input: RenderInput): RenderScene {
  // Diagnostics already known before scene-building starts (e.g. an
  // unresolved Style/Layout ref from sflToCanvasState) merge with whatever
  // this function discovers on its own below (empty-mesh-gradient, etc.).
  const diagnostics: RenderDiagnostic[] = [...(input.diagnostics ?? [])];
  const nodes = [
    ...input.frames.flatMap((frame, i) => tag(buildFrame(frame, i), 'frame', frame.id, undefined, frame.title ?? undefined)),
    ...input.swimlanes.flatMap((swimlane, i) => tag(buildSwimlane(swimlane, i), 'swimlane', swimlane.id)),
    ...(input.tables ?? []).flatMap((table, i) => tag(buildTable(table, i), 'table', table.id, undefined, table.title ?? undefined)),
    ...(input.paths ?? []).flatMap((path, i) => tag(buildFreeformPath(path, i), 'path', path.id, 'path', 'Path')),
    ...(input.charts ?? []).flatMap((chart, i) => tag(buildChart(chart, i), 'chart', chart.id, chart.chart_type, chart.title ?? 'Chart')),
    // Falls back to "fromId → toId" rather than leaving ariaLabel undefined
    // for an unlabeled link (most of them — `text:` is optional): tag()'s own
    // tabindex is gated on ariaLabel being present, so a link with no text
    // was never focusable at all, and stickyflow/interaction's Backspace
    // handler needs focus (see viewer/interaction.ts's onPointerUp) — an
    // unlabeled link could be SELECTED by clicking it but never actually
    // deleted with the keyboard. Shapes don't have this gap since they
    // already fall back to their own shapeType a few lines below.
    ...input.links.flatMap((item, i) => tag(buildLink(item, i), 'link', item.link.id, undefined, item.link.text || `${item.link.fromId} → ${item.link.toId}`)),
    ...input.shapes.flatMap((shape, index) => tag(buildShape(shape, index, diagnostics), 'entity', shape.id, shape.shapeType, shape.text || shape.shapeType)),
    // Locale-independent code-point tie-break (ADR-02): localeCompare depends on
    // the host ICU/locale and could reorder equal-order nodes across machines.
  ].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}
