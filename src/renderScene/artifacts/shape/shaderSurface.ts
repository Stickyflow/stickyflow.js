import type { RenderNode } from '../../scene';
import { rotatedBounds } from '../../scene';
import type { ShapeRenderContext } from './types';

// Programs that draw their own rectangle. Every other program still needs a circle or an oval.
const RECT_PROGRAMS: ReadonlySet<string> = new Set(['reactivePanel']);

function shaderMask(context: ShapeRenderContext): 'ellipse' | 'rect' | undefined {
  if (context.shape.shapeType === 'circle' || context.shape.shapeType === 'oval') {
    return 'ellipse';
  }
  const rectangular = context.shape.shapeType === 'rectangle' || context.shape.shapeType === 'rounded_rectangle';
  if (rectangular && context.shape.shader && RECT_PROGRAMS.has(context.shape.shader.program)) {
    return 'rect';
  }
  return undefined;
}

export function renderShapeShaderSurface(context: ShapeRenderContext): RenderNode | undefined {
  if (!context.shape.shader) {
    return undefined;
  }
  const mask = shaderMask(context);
  if (!mask) {
    return undefined;
  }
  const padding = mask === 'rect' ? Math.max(0, context.shape.shader.surfacePadding ?? 0) : 0;
  const surfaceBounds = {
    x: context.x - padding,
    y: context.y - padding,
    width: context.width + padding * 2,
    height: context.height + padding * 2,
  };
  return {
    id: `${context.id}-shader`,
    type: 'shader-surface',
    order: context.order,
    bounds: rotatedBounds(surfaceBounds, context.rotation, 0),
    ...surfaceBounds,
    rotation: context.rotation,
    shader: context.shape.shader,
    mask,
    fillColor: context.style.fill?.kind === 'solid' ? context.style.fill.color : undefined,
  };
}
