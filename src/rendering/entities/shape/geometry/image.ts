import type { RenderNode, SceneStyle } from '../../../scene';
import type { ShapeRenderContext } from '../types';
import { shapeNodeBase } from './base';

function imageBorder(context: ShapeRenderContext): RenderNode[] {
  if (context.style.stroke?.kind === 'none' || (context.style.strokeWidth ?? 0) <= 0) {
    return [];
  }
  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke: context.style.stroke,
    strokeWidth: context.style.strokeWidth,
    dash: context.style.dash,
  };
  return [
    {
      ...shapeNodeBase(context),
      id: `${context.id}-border`,
      type: 'rect',
      x: context.x,
      y: context.y,
      width: context.width,
      height: context.height,
      style,
    },
  ];
}

export function renderImage(context: ShapeRenderContext): RenderNode[] {
  if (!context.shape.imageUrl) {
    return [];
  }
  return [
    {
      id: context.id,
      order: context.order,
      bounds: context.bounds,
      type: 'image',
      href: context.shape.imageUrl,
      x: context.x,
      y: context.y,
      width: context.width,
      height: context.height,
      preserveAspectRatio: context.shape.imageFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice',
      opacity: context.style.opacity,
      rotation: context.rotation,
      rotationCenter: context.rotationCenter,
    },
    ...imageBorder(context),
  ];
}
