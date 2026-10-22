import { type IsometricObject, shadeFill } from '../../../model/isometricObject';
import type { RenderNode, SceneEllipse } from '../../scene';
import { isometricContext, unseenHullNode } from './context';
import { labelNodes } from './label';
import { sphereShadowNode } from './shadow';

export function buildSphere(object: IsometricObject, index: number): RenderNode[] {
  const context = isometricContext(object, index);
  const { order, common, box } = context;
  const radius = Math.max(0, Math.min(object.width, object.height, object.depth)) / 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const fill = object.fill ?? '#f8fafc';
  const bounds = { minX: cx - radius, minY: cy - radius, maxX: cx + radius, maxY: cy + radius };

  const body: SceneEllipse = {
    type: 'ellipse',
    id: `isometric-${object.id}-sphere`,
    order: order + 0.1,
    bounds,
    cx,
    cy,
    rx: radius,
    ry: radius,
    style: {
      ...common.style,
      fill: {
        kind: 'linear-gradient',
        angle: 135,
        stops: [
          { offset: 0, color: shadeFill(fill, 1.22) },
          { offset: 0.5, color: fill },
          { offset: 1, color: shadeFill(fill, 0.82) },
        ],
      },
    },
    prop: 'style.fill',
    propKind: 'color',
    propSolidOnly: true,
  };
  const highlight: SceneEllipse = {
    type: 'ellipse',
    id: `isometric-${object.id}-highlight`,
    order: order + 0.2,
    bounds,
    cx: cx - radius * 0.32,
    cy: cy - radius * 0.38,
    rx: radius * 0.26,
    ry: radius * 0.18,
    rotation: -35,
    style: {
      fill: { kind: 'solid', color: '#ffffff' },
      stroke: { kind: 'none' },
      opacity: 0.45,
      blur: radius * 0.1,
      pointerEvents: 'none',
    },
  };

  const shadow = sphereShadowNode(context, radius);
  const nodes: RenderNode[] = [unseenHullNode(context), ...(shadow ? [shadow] : []), body, highlight];
  return object.text ? [...nodes, ...labelNodes(context, object.text)] : nodes;
}
