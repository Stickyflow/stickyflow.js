import type { Shape } from '../../model/shape';
import type { MeasureTextFactory, RenderDiagnostic, RenderNode, SceneStyle } from '../scene';
import { finite, orderOf, rotatedBounds } from '../scene';
import { tag } from '../scene/tagging';
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
      bounds: rotatedBounds({ x, y, width, height }, rotation, strokeWidth + (shape.hasShadow ? 20 : 2)),
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

function renderShaderSurface(context: ShapeRenderContext): RenderNode | undefined {
  if (!context.shape.shader || (context.shape.shapeType !== 'circle' && context.shape.shapeType !== 'oval')) {
    return undefined;
  }
  return {
    id: `${context.id}-shader`,
    type: 'shader-surface',
    order: context.order,
    bounds: context.bounds,
    x: context.x,
    y: context.y,
    width: context.width,
    height: context.height,
    rotation: context.rotation,
    shader: context.shape.shader,
    mask: 'ellipse',
  };
}

export function buildShape(
  shape: Shape,
  index: number,
  diagnostics: RenderDiagnostic[],
  measureText?: MeasureTextFactory,
): RenderNode[] {
  if (shape.isVisible === false) {
    return [];
  }
  const { context, strokeWidth } = createRenderContext(shape, index, diagnostics);
  const nodes =
    shape.strokeStyle === 'double' ? renderDoubleStroke(context, strokeWidth || 1) : renderShapeGeometry(context);
  const shader = renderShaderSurface(context);
  if (shader) {
    for (const node of nodes) {
      if (node.type === 'ellipse' || node.type === 'path' || node.type === 'rect') {
        node.style = { ...node.style, pointerEvents: 'all' };
      }
    }
    nodes.push(shader);
  }
  const text = renderShapeText(context, strokeWidth, measureText);
  if (text) {
    nodes.push(text);
  }
  return nodes;
}

export function buildShapes(
  shapes: readonly Shape[],
  diagnostics: RenderDiagnostic[],
  measureText?: MeasureTextFactory,
): RenderNode[] {
  return shapes.flatMap((shape, index) =>
    tag(
      buildShape(shape, index, diagnostics, measureText),
      'shape',
      shape.id,
      shape.shapeType,
      shape.text || shape.shapeType,
      shape.parentFrameId ?? undefined,
    ),
  );
}
