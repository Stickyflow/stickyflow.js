import type { ShapeType } from '../../../../model/shapes';
import type { RenderNode } from '../../../scene';
import type { ShapeGeometryRenderer, ShapeRenderContext } from '../types';
import { renderCylinder, renderPerson } from './compound';
import { renderEllipse, renderPath, renderRectangle, renderSymbol } from './simple';

const GEOMETRY_RENDERERS: Record<ShapeType, ShapeGeometryRenderer> = {
  circle: renderEllipse,
  container_rectangle: renderRectangle,
  cylinder: renderCylinder,
  diamond: renderPath,
  document: renderPath,
  hexagon: renderPath,
  oval: renderEllipse,
  parallelogram: renderPath,
  person: renderPerson,
  pill: renderRectangle,
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
