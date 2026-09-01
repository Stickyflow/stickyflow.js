import type { RenderNode } from '../../../renderScene';
import type { ShapeRenderContext } from '../types';
import { shapeNodeBase } from './base';

export function renderCylinder(context: ShapeRenderContext): RenderNode[] {
  const base = shapeNodeBase(context);
  const cap = context.height * 0.15;
  const cx = context.x + context.width / 2;
  return [
    {
      ...base,
      id: `${base.id}-body`,
      type: 'rect',
      x: context.x,
      y: context.y + cap,
      width: context.width,
      height: context.height - cap * 2,
    },
    {
      ...base,
      id: `${base.id}-top`,
      type: 'ellipse',
      cx,
      cy: context.y + cap,
      rx: context.width / 2,
      ry: cap,
    },
    {
      ...base,
      id: `${base.id}-bottom`,
      type: 'ellipse',
      cx,
      cy: context.y + context.height - cap,
      rx: context.width / 2,
      ry: cap,
    },
  ];
}

export function renderPerson(context: ShapeRenderContext): RenderNode[] {
  const base = shapeNodeBase(context);
  const radius = Math.min(context.width, context.height);
  const head = radius * 0.3;
  const body = radius * 0.5;
  const cx = context.x + context.width / 2;
  const bodyY = context.y + 2 * head + body;
  return [
    {
      ...base,
      id: `${base.id}-head`,
      type: 'ellipse',
      cx,
      cy: context.y + head,
      rx: head,
      ry: head,
    },
    {
      ...base,
      id: `${base.id}-body`,
      type: 'path',
      d: `M ${cx - body} ${bodyY} A ${body} ${body} 0 0 1 ${cx + body} ${bodyY} L ${cx} ${bodyY} Z`,
      rotationCenter: context.rotationCenter,
    },
  ];
}
