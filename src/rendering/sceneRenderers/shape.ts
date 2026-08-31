import { hasBoldMarkup, wrapRichText } from '../../model/geometry/richText';
import { localShapePath } from '../../model/geometry/shapes';
import { heuristicRichMeasure, type MeasureTextFactory, wrapText } from '../../model/geometry/text';
import type { Shape } from '../../model/shapes';
import { SHAPE_DEFAULTS } from '../../model/shapes';
import { DEFAULT_FONT, finite, freeformPathData, orderOf, paint, rotatedBounds } from '../renderPrimitives';
import type { RenderDiagnostic, RenderNode, SceneStyle, SceneText } from '../renderScene';

function shapeDefaults(
  shape: Shape,
  diagnostics: RenderDiagnostic[],
): (typeof SHAPE_DEFAULTS)[keyof typeof SHAPE_DEFAULTS] {
  const defaults = SHAPE_DEFAULTS[shape.shapeType as keyof typeof SHAPE_DEFAULTS];
  if (defaults) return defaults;
  diagnostics.push({
    severity: 'warning',
    code: 'unknown-shape-type',
    entityId: shape.id,
    message: `Unknown shapeType '${shape.shapeType}', falling back to rectangle defaults.`,
  });
  return SHAPE_DEFAULTS.rectangle;
}

function shapeStyle(shape: Shape, diagnostics: RenderDiagnostic[]): SceneStyle {
  const defaults = shapeDefaults(shape, diagnostics);
  const strokeWidth = finite(shape.strokeWidth, defaults.strokeWidth);
  const dotted = shape.strokeStyle === 'dotted';
  const dash =
    shape.shapeType === 'container_rectangle'
      ? [10, 5]
      : dotted
        ? [0.001, strokeWidth * 2]
        : shape.strokeStyle === 'dashed'
          ? [strokeWidth * 4, strokeWidth * 2]
          : shape.dash;
  const shadow =
    shape.shadowStyle ??
    (shape.hasShadow
      ? { enabled: true, color: '#000000', opacity: 0.25, blur: 10, angle: 45, distance: 5 }
      : undefined);
  const angle = (finite(shadow?.angle, 45) * Math.PI) / 180;
  return {
    fill: paint(shape.fillColor, diagnostics, shape.id),
    stroke: paint(shape.strokeColor, diagnostics, shape.id),
    strokeWidth,
    dash: dash?.length ? dash : undefined,
    lineCap: dotted ? 'round' : 'butt',
    opacity: finite(shape.shapeStyle?.opacity, 1),
    shadow: shadow?.enabled
      ? {
          color: shadow.color,
          opacity: finite(shadow.opacity, 0.25),
          blur: finite(shadow.blur, 10),
          dx: Math.cos(angle) * finite(shadow.distance, 5),
          dy: Math.sin(angle) * finite(shadow.distance, 5),
        }
      : undefined,
  };
}

export function buildShape(
  shape: Shape,
  index: number,
  diagnostics: RenderDiagnostic[],
  measureText?: MeasureTextFactory,
): RenderNode[] {
  if (shape.is_visible === false) return [];
  const x = finite(shape.x, 0),
    y = finite(shape.y, 0),
    width = Math.max(0, finite(shape.width, 100)),
    height = Math.max(0, finite(shape.height, 100));
  const rotation = finite(shape.rotation, 0),
    strokeWidth = finite(shape.strokeWidth, 2);
  const bounds = rotatedBounds(x, y, width, height, rotation, strokeWidth + (shape.hasShadow ? 20 : 2));
  const style = shapeStyle(shape, diagnostics),
    order = orderOf(shape, 10_000 + index);
  const nodes: RenderNode[] = [];
  const base = { id: `shape-${shape.id}`, order, bounds, rotation, style };
  const rotationCenter = { x: x + width / 2, y: y + height / 2 };

  const pushGeometry = (gx: number, gy: number, gw: number, gh: number, gStyle: SceneStyle, suffix: string) => {
    const g = { ...base, id: `${base.id}${suffix}`, style: gStyle };
    const path = localShapePath(shape.shapeType, gx, gy, gw, gh);
    if (path) nodes.push({ ...g, type: 'path', d: path, rotationCenter });
    else if (shape.shapeType === 'circle' || shape.shapeType === 'oval') {
      nodes.push({ ...g, type: 'ellipse', cx: gx + gw / 2, cy: gy + gh / 2, rx: gw / 2, ry: gh / 2 });
    } else if (shape.shapeType === 'cylinder') {
      const cap = gh * 0.15;
      nodes.push({ ...g, id: `${g.id}-body`, type: 'rect', x: gx, y: gy + cap, width: gw, height: gh - cap * 2 });
      nodes.push({ ...g, id: `${g.id}-top`, type: 'ellipse', cx: gx + gw / 2, cy: gy + cap, rx: gw / 2, ry: cap });
      nodes.push({
        ...g,
        id: `${g.id}-bottom`,
        type: 'ellipse',
        cx: gx + gw / 2,
        cy: gy + gh - cap,
        rx: gw / 2,
        ry: cap,
      });
    } else if (shape.shapeType === 'person') {
      const r = Math.min(gw, gh),
        head = r * 0.3,
        body = r * 0.5,
        cx = gx + gw / 2;
      nodes.push({ ...g, id: `${g.id}-head`, type: 'ellipse', cx, cy: gy + head, rx: head, ry: head });
      nodes.push({
        ...g,
        id: `${g.id}-body`,
        type: 'path',
        d: `M ${cx - body} ${gy + 2 * head + body} A ${body} ${body} 0 0 1 ${cx + body} ${gy + 2 * head + body} L ${cx} ${gy + 2 * head + body} Z`,
        rotationCenter,
      });
    } else if (shape.shapeType === 'symbol' && shape.symbol && shape.symbol.points.length >= 2) {
      const points = shape.symbol.points.map(([px, py]) => ({ x: gx + px * gw, y: gy + py * gh }));
      nodes.push({
        ...g,
        type: 'path',
        d: freeformPathData(points, finite(shape.symbol.tension, 0), true),
        rotationCenter,
      });
    } else {
      const rx =
        shape.shapeType === 'pill'
          ? Math.min(gw, gh) / 2
          : shape.shapeType === 'rounded_rectangle'
            ? finite(shape.cornerRadius, 8)
            : 0;
      nodes.push({ ...g, type: 'rect', x: gx, y: gy, width: gw, height: gh, rx });
    }
  };

  if (shape.shapeType === 'image') {
    if (shape.imageUrl) {
      const rotationCenter = { x: x + width / 2, y: y + height / 2 };
      nodes.push({
        id: base.id,
        order,
        bounds,
        type: 'image',
        href: shape.imageUrl,
        x,
        y,
        width,
        height,
        preserveAspectRatio: shape.imageFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice',
        opacity: style.opacity,
        rotation,
        rotationCenter,
      });
      if (style.stroke?.kind !== 'none' && (style.strokeWidth ?? 0) > 0) {
        nodes.push({
          ...base,
          id: `${base.id}-border`,
          type: 'rect',
          x,
          y,
          width,
          height,
          style: { fill: { kind: 'none' }, stroke: style.stroke, strokeWidth: style.strokeWidth, dash: style.dash },
        });
      }
    }
  } else if (shape.strokeStyle === 'double') {
    const total = strokeWidth || 1;
    const insetWidth = Math.max(0, width - 2 * total),
      insetHeight = Math.max(0, height - 2 * total);
    const ring: SceneStyle = {
      ...style,
      fill: { kind: 'none' },
      strokeWidth: Math.max(1, total / 3),
      dash: undefined,
      shadow: undefined,
    };
    pushGeometry(x, y, width, height, ring, '');
    if (insetWidth > 0 && insetHeight > 0) {
      pushGeometry(
        x + total,
        y + total,
        insetWidth,
        insetHeight,
        { ...style, stroke: { kind: 'none' }, strokeWidth: 0, dash: undefined },
        '-fill',
      );
      pushGeometry(x + total, y + total, insetWidth, insetHeight, ring, '-inner');
    }
  } else {
    pushGeometry(x, y, width, height, style, '');
  }

  if (shape.text) {
    const fontSize = finite(
      shape.fontSize,
      (SHAPE_DEFAULTS[shape.shapeType as keyof typeof SHAPE_DEFAULTS] ?? SHAPE_DEFAULTS.rectangle).fontSize,
    );
    const padding = Math.max(8, strokeWidth * 2);
    const textWidth = Math.max(0, width - padding * 2);
    const fontFamily = shape.fontFamily || DEFAULT_FONT;
    const metrics = measureText?.(fontFamily, fontSize);
    const textNode: SceneText = {
      type: 'text',
      id: `shape-text-${shape.id}`,
      order: order + 0.5,
      bounds,
      x: x + padding,
      y: y + padding,
      width: textWidth,
      height: Math.max(0, height - padding * 2),
      lines: wrapText(shape.text, textWidth, fontSize, metrics),
      fontFamily,
      fontSize,
      fontWeight: shape.fontWeight ?? 'normal',
      color: shape.textColor || '#111827',
      align: shape.textAlign ?? 'center',
      verticalAlign: shape.textVerticalAlign ?? 'middle',
      lineHeight: finite(shape.lineHeight, 1.3),
      rotation,
      rotationCenter: { x: x + width / 2, y: y + height / 2 },
    };
    if (hasBoldMarkup(shape.text)) {
      const { measure, spaceWidth } = metrics ?? heuristicRichMeasure(fontSize);
      textNode.richLines = wrapRichText(shape.text, textWidth, measure, spaceWidth);
    }
    nodes.push(textNode);
  }
  return nodes;
}
