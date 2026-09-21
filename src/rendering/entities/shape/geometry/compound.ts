import type { RenderNode } from '../../../scene';
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

const PERSON_HEAD_RATIO = 0.25;
const PERSON_NECK_GAP_RATIO = 0.12;
const ELLIPSE_QUARTER_CONTROL = 0.5523;

export function renderPerson(context: ShapeRenderContext): RenderNode[] {
  const base = shapeNodeBase(context);
  const headRadius = Math.min(context.width, context.height) * PERSON_HEAD_RATIO;
  const shoulderHeight = Math.max(0, context.height - 2 * headRadius - headRadius * PERSON_NECK_GAP_RATIO);
  const left = context.x;
  const right = context.x + context.width;
  const centerX = context.x + context.width / 2;
  const bottom = context.y + context.height;
  const apex = bottom - shoulderHeight;
  const reachX = (context.width / 2) * ELLIPSE_QUARTER_CONTROL;
  const reachY = shoulderHeight * ELLIPSE_QUARTER_CONTROL;
  return [
    {
      ...base,
      id: `${base.id}-head`,
      type: 'ellipse',
      cx: centerX,
      cy: context.y + headRadius,
      rx: headRadius,
      ry: headRadius,
    },
    {
      ...base,
      id: `${base.id}-body`,
      type: 'path',
      d:
        `M ${left} ${bottom} C ${left} ${bottom - reachY} ${centerX - reachX} ${apex} ${centerX} ${apex} ` +
        `C ${centerX + reachX} ${apex} ${right} ${bottom - reachY} ${right} ${bottom} Z`,
      rotationCenter: context.rotationCenter,
    },
  ];
}
