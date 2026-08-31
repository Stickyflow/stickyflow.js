import type { Shape } from '../../model/shapes';
import { SHAPE_DEFAULTS } from '../../model/shapes';
import type { Frame } from '../../model/frames';
import type { Link, MarkerType } from '../../model/links';
import { getLinkStrokeColor } from '../../model/links';
import type { Swimlane } from '../../model/swimlanes';
import { computeRowHeight, type Table } from '../../model/tables';
import type { FreeformPath } from '../../model/paths';
import { colorAtRamp } from '../field';
import { tableBorderGeometry } from '../../model/geometry/tables';
import { localShapePath } from '../../model/geometry/shapes';
import { wrapText, heuristicRichMeasure, type MeasureTextFactory } from '../../model/geometry/text';
import { hasBoldMarkup, wrapRichText } from '../../model/geometry/richText';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash, roundedOrthogonalPathData } from '../../model/geometry/connectionLine';
import type { PathSegment } from '../../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene,
  ScenePath, SceneStyle, SceneText,
} from '../renderScene';
import { DEFAULT_FONT, EMPTY_BOUNDS, finite, orderOf, boxBounds, rotatedBounds, paint, freeformPathData, tag } from '../renderPrimitives';
import { buildChart } from '../charts';

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

export function buildShape(shape: Shape, index: number, diagnostics: RenderDiagnostic[], measureText?: MeasureTextFactory): RenderNode[] {
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




