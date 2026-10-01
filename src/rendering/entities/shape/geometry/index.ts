import type { ShapeType } from '../../../../model/shapes';
import type { RenderNode } from '../../../scene';
import type { ShapeGeometryRenderer, ShapeRenderContext } from '../types';
import { renderBoundedPath, renderEllipse, renderPath, renderRectangle, renderSymbol } from './simple';

const GEOMETRY_RENDERERS: Record<ShapeType, ShapeGeometryRenderer> = {
  cloud: renderPath,
  cylinder: renderPath,
  diamond: renderPath,
  document: renderPath,
  hexagon: renderPath,
  note: renderPath,
  oval: renderEllipse,
  parallelogram: renderPath,
  person: renderBoundedPath,
  pill: renderRectangle,
  predefined_process: renderPath,
  rectangle: renderRectangle,
  rounded_rectangle: renderRectangle,
  symbol: renderSymbol,
  trapezoid: renderPath,
  triangle: renderPath,
};

export function renderShapeGeometry(context: ShapeRenderContext): RenderNode[] {
  const renderer = GEOMETRY_RENDERERS[context.shape.shapeType] ?? renderRectangle;
  return renderer(context);
}
