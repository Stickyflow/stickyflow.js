import type { Shape } from '../model/shapes';
import { SHAPE_DEFAULTS } from '../model/shapes';
import type { Frame } from '../model/frames';
import type { Link, MarkerType } from '../model/links';
import { getLinkStrokeColor } from '../model/links';
import type { Swimlane } from '../model/swimlanes';
import { computeRowHeight, type Table } from '../model/tables';
import type { FreeformPath } from '../model/paths';
import { colorAtRamp } from './field';
import { tableBorderGeometry } from '../model/geometry/tables';
import { localShapePath } from '../model/geometry/shapes';
import { wrapText, heuristicRichMeasure, type MeasureTextFactory } from '../model/geometry/text';
import { hasBoldMarkup, wrapRichText } from '../model/geometry/richText';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash, roundedOrthogonalPathData } from '../model/geometry/connectionLine';
import type { PathSegment } from '../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene,
  ScenePath, SceneStyle, SceneText,
} from './renderScene';
import { DEFAULT_FONT, EMPTY_BOUNDS, finite, orderOf, boxBounds, rotatedBounds, paint, freeformPathData, tag } from './renderPrimitives';
import { buildChart } from './charts';

// A `shape:` value that names neither a built-in ShapeType nor a resolved
// Symbol (typo, or a value authored for a newer SFL version this build
// doesn't know yet) used to pass through as an arbitrary string and crash
// here with "Cannot read properties of undefined" - falls back to rectangle
// defaults instead, with a diagnostic so the gap is visible, not silent.
function shapeDefaults(shape: Shape, diagnostics: RenderDiagnostic[]): typeof SHAPE_DEFAULTS[keyof typeof SHAPE_DEFAULTS] {
  const defaults = SHAPE_DEFAULTS[shape.shapeType as keyof typeof SHAPE_DEFAULTS];
  if (defaults) return defaults;
  diagnostics.push({ severity: 'warning', code: 'unknown-shape-type', entityId: shape.id, message: `Unknown shapeType '${shape.shapeType}', falling back to rectangle defaults.` });
  return SHAPE_DEFAULTS.rectangle;
}

function shapeStyle(shape: Shape, diagnostics: RenderDiagnostic[]): SceneStyle {
  const defaults = shapeDefaults(shape, diagnostics);
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

function buildShape(shape: Shape, index: number, diagnostics: RenderDiagnostic[], measureText?: MeasureTextFactory): RenderNode[] {
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
  const rotationCenter = { x: x + width / 2, y: y + height / 2 };

  // This shape's silhouette at an ARBITRARY box and style, rather than only at
  // its own bounds — so the `strokeStyle: 'double'` path below can draw the
  // same silhouette three times (outer ring, inset fill, inner ring) without a
  // second copy of the per-shape-type geometry. `rotationCenter` stays the
  // full shape's center for every pass, so an inset ring rotates with the
  // shape instead of around its own smaller centre.
  const pushGeometry = (gx: number, gy: number, gw: number, gh: number, gStyle: SceneStyle, suffix: string) => {
    const g = { ...base, id: `${base.id}${suffix}`, style: gStyle };
    const path = localShapePath(shape.shapeType, gx, gy, gw, gh);
    if (path) nodes.push({ ...g, type: 'path', d: path, rotationCenter });
    else if (shape.shapeType === 'circle' || shape.shapeType === 'oval') {
      nodes.push({ ...g, type: 'ellipse', cx: gx + gw / 2, cy: gy + gh / 2, rx: gw / 2, ry: gh / 2 });
    } else if (shape.shapeType === 'cylinder') {
      const cap = gh * .15;
      nodes.push({ ...g, id: `${g.id}-body`, type: 'rect', x: gx, y: gy + cap, width: gw, height: gh - cap * 2 });
      nodes.push({ ...g, id: `${g.id}-top`, type: 'ellipse', cx: gx + gw / 2, cy: gy + cap, rx: gw / 2, ry: cap });
      nodes.push({ ...g, id: `${g.id}-bottom`, type: 'ellipse', cx: gx + gw / 2, cy: gy + gh - cap, rx: gw / 2, ry: cap });
    } else if (shape.shapeType === 'person') {
      const r = Math.min(gw, gh), head = r * .3, body = r * .5, cx = gx + gw / 2;
      nodes.push({ ...g, id: `${g.id}-head`, type: 'ellipse', cx, cy: gy + head, rx: head, ry: head });
      nodes.push({ ...g, id: `${g.id}-body`, type: 'path', d: `M ${cx - body} ${gy + 2 * head + body} A ${body} ${body} 0 0 1 ${cx + body} ${gy + 2 * head + body} L ${cx} ${gy + 2 * head + body} Z`, rotationCenter });
    } else if (shape.shapeType === 'symbol' && shape.symbol && shape.symbol.points.length >= 2) {
      // §5.5 Symbol: points are normalized (0..1, relative to the instance's
      // own bounding box), so the same definition renders at any size - scale
      // by width/height and offset by x/y here, at render time. Implicitly
      // closed; reuses freeformPathData's Catmull-Rom tension curve (same math
      // FreeformPath already uses below) instead of a second curve
      // implementation, closed: true.
      const points = shape.symbol.points.map(([px, py]) => ({ x: gx + px * gw, y: gy + py * gh }));
      nodes.push({ ...g, type: 'path', d: freeformPathData(points, finite(shape.symbol.tension, 0), true), rotationCenter });
    } else {
      const rx = shape.shapeType === 'pill' ? Math.min(gw, gh) / 2
        : shape.shapeType === 'rounded_rectangle' ? finite(shape.cornerRadius, 8) : 0;
      nodes.push({ ...g, type: 'rect', x: gx, y: gy, width: gw, height: gh, rx });
    }
  };

  if (shape.shapeType === 'image') {
    // Maps §3.3: base-layer image. No fallback placeholder rect when imageUrl
    // is unset - unlike the live Konva canvas (which shows a loading/missing
    // state to a person actively editing), this is a one-shot static render;
    // an empty box would just be visual noise in the output.
    if (shape.imageUrl) {
      const rotationCenter = { x: x + width / 2, y: y + height / 2 };
      nodes.push({
        id: base.id, order, bounds, type: 'image', href: shape.imageUrl, x, y, width, height,
        preserveAspectRatio: shape.imageFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice',
        opacity: style.opacity, rotation, rotationCenter,
      });
      // <image> isn't stroke-able in SVG - a plain frame rect on top instead,
      // only when a border was actually set (mirrors ImageRenderer.tsx).
      if (style.stroke?.kind !== 'none' && (style.strokeWidth ?? 0) > 0) {
        nodes.push({ ...base, id: `${base.id}-border`, type: 'rect', x, y, width, height, style: { fill: { kind: 'none' }, stroke: style.stroke, strokeWidth: style.strokeWidth, dash: style.dash } });
      }
    }
  } else if (shape.strokeStyle === 'double') {
    // Two thin rings — the outer at the shape's nominal boundary, the inner
    // inset by the full strokeWidth — with a genuinely UNFILLED gap between
    // them: the fill starts at the inner ring rather than running edge-to-edge
    // under the whole band. `strokeWidth` is reinterpreted here as the total
    // outer-to-inner span rather than one line's thickness, so raising it
    // pushes the rings apart instead of thickening a single line. Same
    // semantics (and the same /3 ring width) as the interactive canvas app's
    // own getDoubleStrokeGeometry, so one document renders alike in both.
    const total = strokeWidth || 1;
    const insetWidth = Math.max(0, width - 2 * total), insetHeight = Math.max(0, height - 2 * total);
    // Rings never carry the fill or the shadow: a shadow on each of three
    // stacked outlines reads as a blur, not a raised edge (the app disables it
    // on its ring passes for the same reason), and the fill belongs to the
    // inset pass alone.
    const ring: SceneStyle = { ...style, fill: { kind: 'none' }, strokeWidth: Math.max(1, total / 3), dash: undefined, shadow: undefined };
    // Outer ring first so it stays node 0 — tag() marks that one sfPrimary,
    // and the viewer paints its selection ring and resize handles from that
    // node's bbox, which has to be the shape's FULL box, not the inset one.
    pushGeometry(x, y, width, height, ring, '');
    // A shape too small to inset twice keeps just the outer ring, rather than
    // collapsing into a zero/negative-sized inner one.
    if (insetWidth > 0 && insetHeight > 0) {
      pushGeometry(x + total, y + total, insetWidth, insetHeight, { ...style, stroke: { kind: 'none' }, strokeWidth: 0, dash: undefined }, '-fill');
      pushGeometry(x + total, y + total, insetWidth, insetHeight, ring, '-inner');
    }
  } else {
    pushGeometry(x, y, width, height, style, '');
  }

  if (shape.text) {
    // No second diagnostic here - shapeStyle() above already flagged an
    // unknown shapeType for this same shape once.
    const fontSize = finite(shape.fontSize, (SHAPE_DEFAULTS[shape.shapeType as keyof typeof SHAPE_DEFAULTS] ?? SHAPE_DEFAULTS.rectangle).fontSize);
    const padding = Math.max(8, strokeWidth * 2);
    const textWidth = Math.max(0, width - padding * 2);
    const fontFamily = shape.fontFamily || DEFAULT_FONT;
    // Resolved once for this label and reused by both the plain wrap below and
    // the rich (bold-markup) wrap further down, so the two can't disagree about
    // how wide a word is. Undefined without an injected factory — wrapText and
    // heuristicRichMeasure then fall back to the character-count estimate.
    const metrics = measureText?.(fontFamily, fontSize);
    const textNode: SceneText = {
      type: 'text', id: `shape-text-${shape.id}`, order: order + .5, bounds,
      x: x + padding, y: y + padding, width: textWidth, height: Math.max(0, height - padding * 2),
      lines: wrapText(shape.text, textWidth, fontSize, metrics),
      fontFamily, fontSize,
      fontWeight: shape.fontWeight ?? 'normal', color: shape.textColor || '#111827',
      align: shape.textAlign ?? 'center', verticalAlign: shape.textVerticalAlign ?? 'middle',
      lineHeight: finite(shape.lineHeight, 1.3), rotation, rotationCenter: { x: x + width / 2, y: y + height / 2 },
    };
    // §1.4 Infographics inline **bold**: Entity/shape labels only (this is
    // buildShape, not buildLink/buildChart's own label paths) - populate the
    // rich-run wrap alongside the plain one above only when the text actually
    // has bold markup, so every plain-text shape's node (and hence rendered
    // SVG) is untouched.
    if (hasBoldMarkup(shape.text)) {
      const { measure, spaceWidth } = metrics ?? heuristicRichMeasure(fontSize);
      textNode.richLines = wrapRichText(shape.text, textWidth, measure, spaceWidth);
    }
    nodes.push(textNode);
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

// §3.6 Tables: a Footer, when present, is the table's true visual bottom
// (not the last data row) - its own background needs the bottom corners
// rounded instead, the mirror image of topRoundedRectPath above.
function bottomRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y} H ${x + width} V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} Z`;
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
  // §3.6 Tables: Footer is an extra fixed row right after the last data row -
  // one more rowHeight added to the table's own total height, same as
  // computeTableHeight()'s footer term (model/tables.ts).
  const footerHeight = table.footer ? rowHeight : 0;
  const height = headerHeight + table.rows.length * rowHeight + footerHeight;
  const footerY = table.y + headerHeight + table.rows.length * rowHeight;
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
  // §3.6 Tables: Footer background, same color as the header band, bottom-
  // rounded since it's now the table's visual bottom (the single outer body
  // rect above already spans this height too, so no other node needs to
  // change its own corner rounding - unlike the Konva/atlas renderer, this
  // SVG body is one rect for the whole table, not one rect per row).
  if (table.footer) nodes.push({
    type: 'path', id: `table-footer-fill-${table.id}`, order: order + .06, bounds,
    d: bottomRoundedRectPath(table.x, footerY, table.width, rowHeight, table.corner_radius),
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
      const cellY = table.y + headerHeight + rowIndex * rowHeight;
      // §3.6 Tables: Column.scale value-dependent cell background, drawn
      // behind the cell text (order + .09, before the .1-tier grid lines so
      // they still show up on top of a colored cell, and well before the
      // .3-tier text). A non-numeric value (NaN) leaves the cell uncolored,
      // same as atlas's TableComponent.tsx cellFill().
      if (column.scale) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) nodes.push({
          type: 'rect', id: `table-cell-bg-${table.id}-${row.id}-${column.id}`, order: order + .09, bounds,
          x: columnX, y: cellY, width: column.width, height: rowHeight,
          style: simpleContainerStyle(colorAtRamp(column.scale, numeric), 'transparent', 0, []),
        });
      }
      nodes.push({
        type: 'text', id: `table-cell-${table.id}-${row.id}-${column.id}`, order: order + .3, bounds,
        x: columnX + 6, y: cellY,
        width: Math.max(0, column.width - 12), height: rowHeight,
        lines: [String(value ?? '')],
        fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size, fontWeight: 'normal',
        color: table.text_color, align: column.align ?? 'left', verticalAlign: 'middle', lineHeight: 1.2,
      });
    });
    // §3.6 Tables: Footer cell text - bold, same alignment as its column's
    // data cells, no scale background (a summary row isn't itself a sampled
    // value on the same ramp, matching atlas's Footer rendering).
    if (table.footer) nodes.push({
      type: 'text', id: `table-footer-${table.id}-${column.id}`, order: order + .3, bounds,
      x: columnX + 6, y: footerY,
      width: Math.max(0, column.width - 12), height: rowHeight,
      lines: [String(table.footer.cells[column.id] ?? '')],
      fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size, fontWeight: 'bold',
      color: table.text_color, align: column.align ?? 'left', verticalAlign: 'middle', lineHeight: 1.2,
    });
    columnX += column.width;
  });
  // §3.6 Tables: Footer's own top rule - always drawn (unlike ordinary row
  // dividers, not gated by show_horizontal_lines), the same fixed-separator
  // treatment as atlas's TableComponent.tsx footer rule.
  if (table.footer) nodes.push({
    type: 'path', id: `table-footer-rule-${table.id}`, order: order + .1, bounds,
    d: `M ${table.x + gridInset} ${footerY} H ${table.x + table.width - gridInset}`,
    style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
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

function buildLink(item: RenderInput['links'][number], index: number, measureText?: MeasureTextFactory): RenderNode[] {
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
  // Same resolved font the label's text node below is emitted with, so the
  // measured wrap matches what actually gets rendered. Feeds labelHeight, which
  // in turn sizes the label gap punched into the link's dasharray.
  const labelMetrics = measureText?.(link.style?.fontFamily ?? DEFAULT_FONT, fontSize);
  const wrappedLines = hasLabel ? wrapText(link.text!, labelWidth, fontSize, labelMetrics) : [];
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
  // Diagrams §3.2 (weighted graphs): pill badge at the midpoint, offset below
  // the text label when one is shown - mirrors ConnectionLine.tsx's own
  // LinkWeightBadge (same size formula, same neutral-gray fallback).
  const showWeight = link.weight !== undefined && link.weight !== null && link.showWeight !== false;
  if (showWeight) {
    const weightValue = link.weight ?? 0;
    const badgeText = weightValue.toFixed(1);
    const badgeWidth = Math.max(30, badgeText.length * 8 + 12);
    const badgeHeight = 16;
    const badgeY = midpoint.y + (hasLabel ? labelHeight / 2 + 10 : 0);
    nodes.push({
      type: 'rect', id: `link-weight-badge-${link.id}`, order: order + .6, bounds,
      x: midpoint.x - badgeWidth / 2, y: badgeY - badgeHeight / 2, width: badgeWidth, height: badgeHeight, rx: badgeHeight / 2,
      style: { fill: { kind: 'solid', color }, stroke: { kind: 'none' }, opacity: .92 },
    });
    nodes.push({
      type: 'text', id: `link-weight-${link.id}`, order: order + .61, bounds,
      x: midpoint.x - badgeWidth / 2, y: badgeY - badgeHeight / 2, width: badgeWidth, height: badgeHeight,
      lines: [badgeText], fontFamily: 'Arial, sans-serif', fontSize: 10, fontWeight: 'bold', color: '#ffffff',
      align: 'center', verticalAlign: 'middle', lineHeight: 1,
    });
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

export interface BuildRenderSceneOptions {
  /** Supply real glyph metrics for text wrapping instead of this package's
   *  character-count heuristic. See `MeasureTextFactory` — omitting it is what
   *  keeps output byte-identical across platforms. */
  measureText?: MeasureTextFactory;
}

export function buildRenderScene(input: RenderInput, options: BuildRenderSceneOptions = {}): RenderScene {
  const { measureText } = options;
  // Diagnostics already known before scene-building starts (e.g. an
  // unresolved Style/Layout ref from sflToCanvasState) merge with whatever
  // this function discovers on its own below (empty-mesh-gradient, etc.).
  const diagnostics: RenderDiagnostic[] = [...(input.diagnostics ?? [])];
  const nodes = [
    ...input.frames.flatMap((frame, i) => tag(buildFrame(frame, i), 'frame', frame.id, undefined, frame.title ?? undefined)),
    ...input.swimlanes.flatMap((swimlane, i) => tag(buildSwimlane(swimlane, i), 'swimlane', swimlane.id)),
    ...(input.tables ?? []).flatMap((table, i) => tag(buildTable(table, i), 'table', table.id, undefined, table.title ?? undefined)),
    ...(input.paths ?? []).flatMap((path, i) => tag(buildFreeformPath(path, i), 'path', path.id, 'path', 'Path')),
    ...(input.charts ?? []).flatMap((chart, i) => tag(buildChart(chart, i, diagnostics), 'chart', chart.id, chart.chart_type, chart.title ?? 'Chart')),
    // Falls back to "fromId → toId" rather than leaving ariaLabel undefined
    // for an unlabeled link (most of them — `text:` is optional): tag()'s own
    // tabindex is gated on ariaLabel being present, so a link with no text
    // was never focusable at all, and stickyflow/interaction's Backspace
    // handler needs focus (see viewer/interaction.ts's onPointerUp) — an
    // unlabeled link could be SELECTED by clicking it but never actually
    // deleted with the keyboard. Shapes don't have this gap since they
    // already fall back to their own shapeType a few lines below.
    ...input.links.flatMap((item, i) => tag(buildLink(item, i, measureText), 'link', item.link.id, undefined, item.link.text || `${item.link.fromId} → ${item.link.toId}`)),
    ...input.shapes.flatMap((shape, index) => tag(buildShape(shape, index, diagnostics, measureText), 'entity', shape.id, shape.shapeType, shape.text || shape.shapeType)),
    // Locale-independent code-point tie-break (ADR-02): localeCompare depends on
    // the host ICU/locale and could reorder equal-order nodes across machines.
  ].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}
