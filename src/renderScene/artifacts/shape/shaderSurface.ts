import type { RenderNode, SceneClip } from '../../scene';
import { freeformPathData, rotatedBounds } from '../../scene';
import type { ShapeRenderContext } from './types';

// Programs that draw their own rectangle. Every other program still needs a circle or an oval.
const RECT_PROGRAMS: ReadonlySet<string> = new Set([
  'reactivePanel',
  'ledMatrix',
  'lightBand',
  'silkFolds',
  'glowCard',
  'glassDots',
  'horizonGlow',
  'lightStreaks',
  'pulseLine',
  'glassRefraction',
  'grain',
]);

// Programs that fill their whole surface, so the corners of the shape have to be cut from it.
const FILLING_PROGRAMS: ReadonlySet<string> = new Set(['horizonGlow', 'lightStreaks']);

function shaderMask(context: ShapeRenderContext): 'ellipse' | 'rect' | undefined {
  if (context.shape.shapeType === 'circle' || context.shape.shapeType === 'oval') {
    return 'ellipse';
  }
  const rectangular = context.shape.shapeType === 'rectangle' || context.shape.shapeType === 'rounded_rectangle';
  if (
    (rectangular || symbolOutline(context)) &&
    context.shape.shader &&
    RECT_PROGRAMS.has(context.shape.shader.program)
  ) {
    return 'rect';
  }
  return undefined;
}

// The outline of a symbol shape, drawn as the shape draws it, so a program that fills a rectangle can be cut to it.
function symbolOutline(context: ShapeRenderContext): SceneClip | undefined {
  const symbol = context.shape.shapeType === 'symbol' ? context.shape.symbol : undefined;
  if (!symbol || symbol.points.length < 3) {
    return undefined;
  }
  const place = ([x, y]: [number, number]) => ({ x: context.x + x * context.width, y: context.y + y * context.height });
  const d = symbol.rings
    ? symbol.rings.map(ring => freeformPathData({ points: ring.map(place), tension: 0, closed: true })).join(' ')
    : freeformPathData({ points: symbol.points.map(place), tension: symbol.tension ?? 0, closed: true });
  return { type: 'path', d };
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
    // On a rectangle glass is a pane with the corners of its shape.
    shader:
      mask === 'rect' && context.shape.shader.program === 'glassRefraction'
        ? {
            ...context.shape.shader,
            parameters: {
              panel: 1,
              cornerRadius: context.shape.shapeType === 'rounded_rectangle' ? (context.shape.cornerRadius ?? 8) : 0,
              ...context.shape.shader.parameters,
            },
          }
        : context.shape.shader,
    mask,
    fillColor: context.style.fill?.kind === 'solid' ? context.style.fill.color : undefined,
    cornerRadius:
      context.shape.shapeType === 'rounded_rectangle' && FILLING_PROGRAMS.has(context.shape.shader.program)
        ? (context.shape.cornerRadius ?? 8)
        : undefined,
    clip: symbolOutline(context),
  };
}
