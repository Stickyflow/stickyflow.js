import { localShapePath } from '../../../../model/geometry/shapes';
import { finite, freeformPathData } from '../../../renderPrimitives';
import type { RenderNode } from '../../../scene';
import type { ShapeRenderContext } from '../types';
import { shapeNodeBase } from './base';

export function renderPath(context: ShapeRenderContext): RenderNode[] {
  const path = localShapePath(context.shape.shapeType, context.x, context.y, context.width, context.height);
  if (!path) {
    return [];
  }
  return [{ ...shapeNodeBase(context), type: 'path', d: path, rotationCenter: context.rotationCenter }];
}

export function renderRectangle(context: ShapeRenderContext): RenderNode[] {
  const rx =
    context.shape.shapeType === 'pill'
      ? Math.min(context.width, context.height) / 2
      : context.shape.shapeType === 'rounded_rectangle'
        ? finite(context.shape.cornerRadius, 8)
        : 0;
  return [
    {
      ...shapeNodeBase(context),
      type: 'rect',
      x: context.x,
      y: context.y,
      width: context.width,
      height: context.height,
      rx,
    },
  ];
}

export function renderEllipse(context: ShapeRenderContext): RenderNode[] {
  return [
    {
      ...shapeNodeBase(context),
      type: 'ellipse',
      cx: context.x + context.width / 2,
      cy: context.y + context.height / 2,
      rx: context.width / 2,
      ry: context.height / 2,
    },
  ];
}

export function renderSymbol(context: ShapeRenderContext): RenderNode[] {
  if (!context.shape.symbol || context.shape.symbol.points.length < 2) {
    return renderRectangle(context);
  }
  const points = context.shape.symbol.points.map(([x, y]) => ({
    x: context.x + x * context.width,
    y: context.y + y * context.height,
  }));
  return [
    {
      ...shapeNodeBase(context),
      type: 'path',
      d: freeformPathData(points, finite(context.shape.symbol.tension, 0), true),
      rotationCenter: context.rotationCenter,
    },
  ];
}
