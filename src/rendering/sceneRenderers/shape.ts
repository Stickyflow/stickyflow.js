import type { MeasureTextFactory } from '../../model/geometry/text';
import type { Shape } from '../../model/shapes';
import { finite, orderOf, rotatedBounds } from '../renderPrimitives';
import type { RenderDiagnostic, RenderNode, SceneStyle } from '../scene';
import { renderShapeGeometry } from './shape/geometry';
import { shapeStyle } from './shape/style';
import { renderShapeText } from './shape/text';
import type { ShapeRenderContext } from './shape/types';

function renderDoubleStroke(context: ShapeRenderContext, strokeWidth: number): RenderNode[] {
  const insetWidth = Math.max(0, context.width - 2 * strokeWidth);
  const insetHeight = Math.max(0, context.height - 2 * strokeWidth);
  const ring: SceneStyle = {
    ...context.style,
    fill: { kind: 'none' },
    strokeWidth: Math.max(1, strokeWidth / 3),
    dash: undefined,
    shadow: undefined,
  };
  const nodes = renderShapeGeometry({ ...context, style: ring });
  if (insetWidth <= 0 || insetHeight <= 0) {
    return nodes;
  }

  const inset = {
    ...context,
    x: context.x + strokeWidth,
    y: context.y + strokeWidth,
    width: insetWidth,
    height: insetHeight,
  };
  nodes.push(
    ...renderShapeGeometry({
      ...inset,
      id: `${context.id}-fill`,
      style: { ...context.style, stroke: { kind: 'none' }, strokeWidth: 0, dash: undefined },
    }),
    ...renderShapeGeometry({ ...inset, id: `${context.id}-inner`, style: ring }),
  );
  return nodes;
}

function createRenderContext(
  shape: Shape,
  index: number,
  diagnostics: RenderDiagnostic[],
): { context: ShapeRenderContext; strokeWidth: number } {
  const x = finite(shape.x, 0);
  const y = finite(shape.y, 0);
  const width = Math.max(0, finite(shape.width, 100));
  const height = Math.max(0, finite(shape.height, 100));
  const rotation = finite(shape.rotation, 0);
  const strokeWidth = finite(shape.strokeWidth, 2);
  return {
    strokeWidth,
    context: {
      shape,
      id: `shape-${shape.id}`,
      order: orderOf(shape, 10_000 + index),
      bounds: rotatedBounds(x, y, width, height, rotation, strokeWidth + (shape.hasShadow ? 20 : 2)),
      rotation,
      rotationCenter: { x: x + width / 2, y: y + height / 2 },
      style: shapeStyle(shape, diagnostics),
      x,
      y,
      width,
      height,
    },
  };
}

export function buildShape(
  shape: Shape,
  index: number,
  diagnostics: RenderDiagnostic[],
  measureText?: MeasureTextFactory,
): RenderNode[] {
  if (shape.is_visible === false) {
    return [];
  }
  const { context, strokeWidth } = createRenderContext(shape, index, diagnostics);
  const nodes =
    shape.strokeStyle === 'double' && shape.shapeType !== 'image'
      ? renderDoubleStroke(context, strokeWidth || 1)
      : renderShapeGeometry(context);
  const text = renderShapeText(context, strokeWidth, measureText);
  if (text) {
    nodes.push(text);
  }
  return nodes;
}
