import type { GradientColorObject, MeshGradientObject, Shape, ShapeType } from '../model/shapes';
import { SHAPE_DEFAULTS } from '../model/shapes';
import type { Frame } from '../model/frames';
import type { Link, MarkerType } from '../model/links';
import { getLinkStrokeColor } from '../model/links';
import type { Swimlane } from '../model/swimlanes';
import { computeRowHeight, type Table } from '../model/tables';
import { tableBorderGeometry } from '../model/geometry/tables';
import { getDashArray, getLineMidpoint, getPathPoints } from '../model/geometry/connectionLine';
import type { PathSegment } from '../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene, SceneRole,
  ScenePaint, ScenePath, SceneStyle,
} from './renderScene';

// Interactive DOM contract (ADR-03): stamp every node of an owner with a shared
// role + id so the viewer can map any sub-node (text, divider, cell) back to its
// entity; the first (primary) node also gets an aria-label and becomes focusable.
function tag(nodes: RenderNode[], sfRole: SceneRole, sfId: string, sfKind?: string, ariaLabel?: string): RenderNode[] {
  nodes.forEach((node, index) => {
    node.sfRole = sfRole;
    node.sfId = sfId;
    if (sfKind) node.sfKind = sfKind;
    if (index === 0 && ariaLabel) node.ariaLabel = ariaLabel;
  });
  return nodes;
}

const DEFAULT_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const EMPTY_BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const orderOf = (entity: { order_key?: string; orderKey?: string }, fallback: number): number => {
  const key = entity.order_key ?? entity.orderKey;
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

const polygonPath = (points: number[]): string =>
  points.length < 4 ? '' : `M ${points[0]} ${points[1]} ${points.slice(2).reduce((s, n, i) => s + (i % 2 ? ` ${n}` : ` L ${n}`), '')} Z`;

function localShapePath(type: ShapeType, x: number, y: number, width: number, height: number): string | null {
  const p = (...coords: number[]) => polygonPath(coords);
  switch (type) {
    case 'diamond': return p(x + width / 2, y, x + width, y + height / 2, x + width / 2, y + height, x, y + height / 2);
    case 'triangle': return p(x + width / 2, y, x, y + height, x + width, y + height);
    case 'parallelogram': return p(x + width * .15, y, x + width, y, x + width * .85, y + height, x, y + height);
    case 'trapezoid': return p(x + width * .2, y, x + width * .8, y, x + width, y + height, x, y + height);
    case 'hexagon': {
      const radius = Math.min(width, height) / 2, cx = x + width / 2, cy = y + height / 2;
      const points: number[] = [];
      for (let i = 0; i < 6; i++) points.push(cx + radius * Math.cos(i * Math.PI / 3), cy + radius * Math.sin(i * Math.PI / 3));
      return p(...points);
    }
    case 'document': {
      const wave = height * .15;
      return `M ${x} ${y} H ${x + width} V ${y + height - wave} ` +
        `Q ${x + width * .875} ${y + height + wave * .15} ${x + width * .75} ${y + height - wave} ` +
        `Q ${x + width * .625} ${y + height + wave * .15} ${x + width * .5} ${y + height - wave} ` +
        `Q ${x + width * .375} ${y + height + wave * .15} ${x + width * .25} ${y + height - wave} ` +
        `Q ${x + width * .125} ${y + height + wave * .15} ${x} ${y + height - wave} Z`;
    }
    default: return null;
  }
}

function wrapText(text: string, width: number, fontSize: number): string[] {
  const maxChars = Math.max(1, Math.floor(width / Math.max(1, fontSize * .58)));
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) { result.push(''); continue; }
    let line = '';
    for (const word of words) {
      if (!line) line = word;
      else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`;
      else { result.push(line); line = word; }
    }
    result.push(line);
  }
  return result;
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
  const nodes: RenderNode[] = [{ type: 'rect', id: `swimlane-${swimlane.id}`, order, bounds, x: swimlane.x, y: swimlane.y, width: swimlane.width, height: swimlane.height, rx: swimlane.corner_radius, style }];
  if (swimlane.title) {
    nodes.push(...titleTabNodes(`swimlane-tab-${swimlane.id}`, `swimlane-title-${swimlane.id}`, swimlane.x, swimlane.y, swimlane.corner_radius, swimlane.title, swimlane.stroke_color, swimlane.font_family, swimlane.font_size, swimlane.font_weight, order));
  }
  let cursor = 0;
  swimlane.lanes.slice(0, -1).forEach((lane, laneIndex) => {
    cursor += lane.size;
    const d = swimlane.orientation === 'horizontal'
      ? `M ${swimlane.x} ${swimlane.y + cursor} H ${swimlane.x + swimlane.width}`
      : `M ${swimlane.x + cursor} ${swimlane.y} V ${swimlane.y + swimlane.height}`;
    nodes.push({ type: 'path', id: `swimlane-divider-${swimlane.id}-${laneIndex}`, order: order + .1 + laneIndex / 100, bounds, d, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: swimlane.stroke_color }, strokeWidth: swimlane.stroke_width } });
  });
  if (swimlane.show_lane_labels) {
    cursor = 0;
    swimlane.lanes.forEach((lane, laneIndex) => {
      const horizontal = swimlane.orientation === 'horizontal';
      const x = swimlane.x + (horizontal ? 10 : cursor + 8), y = swimlane.y + (horizontal ? cursor + 8 : 8);
      const width = horizontal ? swimlane.width - 20 : lane.size - 16, height = horizontal ? lane.size - 16 : swimlane.height - 16;
      nodes.push({ type: 'text', id: `swimlane-label-${swimlane.id}-${lane.id}`, order: order + .5 + laneIndex / 100, bounds, x, y, width: Math.max(0, width), height: Math.max(0, height), lines: [lane.label], fontFamily: swimlane.font_family ?? DEFAULT_FONT, fontSize: swimlane.font_size, fontWeight: swimlane.font_weight, color: swimlane.text_color, align: 'left', verticalAlign: 'top', lineHeight: 1.2 });
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
    type: 'rect', id: `table-header-fill-${table.id}`, order: order + .06, bounds,
    x: table.x, y: table.y, width: table.width, height: rowHeight, rx: table.corner_radius,
    style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
  });
  let columnX = table.x;
  table.columns.forEach((column, columnIndex) => {
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

function marker(link: Link, end: 'start' | 'end'): MarkerType {
  const explicit = end === 'start' ? (link.startMarker ?? link.start_marker) : (link.endMarker ?? link.end_marker);
  if (explicit) return explicit;
  const direction = link.style?.arrowDirection ?? 'forward';
  if (direction === 'bidirectional') return 'arrow';
  if (end === 'start' && direction === 'backward') return 'arrow';
  if (end === 'end' && direction === 'forward') return 'arrow';
  return 'none';
}

function roundedOrthogonalPathData(segments: PathSegment[], radius: number): string {
  if (!segments.length) return '';
  const raw = [segments[0].start, ...segments.map(segment => segment.end)];
  const points = raw.filter((point, index) => index === 0 || point.x !== raw[index - 1].x || point.y !== raw[index - 1].y);
  const corners = points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true;
    const previous = points[index - 1], next = points[index + 1];
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
  if (corners.length < 2) return '';
  let d = `M ${corners[0].x} ${corners[0].y}`;
  for (let index = 1; index < corners.length - 1; index++) {
    const previous = corners[index - 1], corner = corners[index], next = corners[index + 1];
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, incoming * .4, outgoing * .4);
    const before = { x: corner.x + (previous.x - corner.x) / incoming * r, y: corner.y + (previous.y - corner.y) / incoming * r };
    const after = { x: corner.x + (next.x - corner.x) / outgoing * r, y: corner.y + (next.y - corner.y) / outgoing * r };
    d += ` L ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y}`;
  }
  const last = corners[corners.length - 1];
  return `${d} L ${last.x} ${last.y}`;
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
  const style: SceneStyle = { fill: { kind: 'none' }, stroke: typeof link.style?.color === 'object' && link.style.color.type === 'gradient' ? { kind: 'linear-gradient', angle: 0, stops: link.style.color.stops.map(s => ({ offset: s.position, color: s.color })) } : { kind: 'solid', color }, strokeWidth, dash: getDashArray(strokeWidth, link.style?.strokeStyle ?? 'solid'), lineCap: 'round', lineJoin: 'round', opacity: finite(link.style?.opacity, 1) };
  // Fallback band above shapes' (see buildShape): connectors and their end
  // markers should paint on top of the shapes they connect, not underneath.
  const order = orderOf(link, 20_000 + index);
  const path: ScenePath = { type: 'path', id: `link-${link.id}`, order, bounds, d: pathData(points, pathType, segments, strokeWidth), style, markerStart: marker(link, 'start'), markerEnd: marker(link, 'end') };
  const nodes: RenderNode[] = [path];
  if (link.showText && link.text) {
    const fontSize = finite(link.style?.fontSize, 10), width = Math.min(250, Math.max(fontSize * 2, link.text.length * fontSize * .65 + 10));
    nodes.push({ type: 'text', id: `link-text-${link.id}`, order: order + .5, bounds, x: midpoint.x - width / 2, y: midpoint.y - fontSize, width, height: fontSize * 2, lines: wrapText(link.text, width, fontSize), fontFamily: link.style?.fontFamily ?? DEFAULT_FONT, fontSize, fontWeight: 'normal', color, align: 'center', verticalAlign: 'middle', lineHeight: 1.4 });
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
  const diagnostics: RenderDiagnostic[] = [];
  const nodes = [
    ...input.frames.flatMap((frame, i) => tag(buildFrame(frame, i), 'frame', frame.id, undefined, frame.title ?? undefined)),
    ...input.swimlanes.flatMap((swimlane, i) => tag(buildSwimlane(swimlane, i), 'swimlane', swimlane.id)),
    ...(input.tables ?? []).flatMap((table, i) => tag(buildTable(table, i), 'table', table.id, undefined, table.title ?? undefined)),
    ...input.links.flatMap((item, i) => tag(buildLink(item, i), 'link', item.link.id, undefined, item.link.text || undefined)),
    ...input.shapes.flatMap((shape, index) => tag(buildShape(shape, index, diagnostics), 'entity', shape.id, shape.shapeType, shape.text || shape.shapeType)),
    // Locale-independent code-point tie-break (ADR-02): localeCompare depends on
    // the host ICU/locale and could reorder equal-order nodes across machines.
  ].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}
