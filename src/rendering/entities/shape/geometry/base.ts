import type { ShapeRenderContext } from '../types';

export function shapeNodeBase(context: ShapeRenderContext) {
  return {
    id: context.id,
    order: context.order,
    bounds: context.bounds,
    rotation: context.rotation,
    style: context.style,
  };
}
