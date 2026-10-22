import { type ExtrudedSide, extrudeFootprint, type IsometricObject, shadeFill } from '../../../model/isometricObject';
import type { RenderNode, ScenePath } from '../../scene';
import { finite } from '../../scene';
import { faceNode, type IsometricContext, isometricContext, unseenHullNode } from './context';
import { labelNodes } from './label';
import { groundShadowNode } from './shadow';

function wallNode(context: IsometricContext, side: ExtrudedSide, index: number, fill: string): ScenePath {
  const color = shadeFill(fill, side.light);
  return faceNode(context, `side-${index}`, 0.05 + index * 0.001, side.points, {
    ...context.common.style,
    stroke: { kind: 'solid', color },
    strokeWidth: 0.6,
    fill: { kind: 'solid', color },
  });
}

function wallEdgesNode(context: IsometricContext, side: ExtrudedSide, index: number): ScenePath {
  const [topFrom, topTo, bottomTo, bottomFrom] = side.points;
  const lines = [
    `M ${bottomFrom.x} ${bottomFrom.y} L ${bottomTo.x} ${bottomTo.y}`,
    ...(side.smoothStart ? [] : [`M ${topFrom.x} ${topFrom.y} L ${bottomFrom.x} ${bottomFrom.y}`]),
    ...(side.smoothEnd ? [] : [`M ${topTo.x} ${topTo.y} L ${bottomTo.x} ${bottomTo.y}`]),
  ];
  return {
    ...context.common,
    id: `isometric-${context.object.id}-side-${index}-edges`,
    order: context.order + 0.0505 + index * 0.001,
    d: lines.join(' '),
    style: { ...context.common.style, fill: { kind: 'none' } },
  };
}

export function buildExtruded(
  object: IsometricObject,
  index: number,
  footprint: Array<[number, number]>,
): RenderNode[] {
  const context = isometricContext(object, index);
  const { top, sides } = extrudeFootprint(object, footprint, Math.max(0, finite(object.cornerRadius, 0)));
  const fill = object.fill ?? '#f8fafc';
  const groundShadow = groundShadowNode(context, top);
  const topFace = faceNode(context, 'top', 0.2, top, { ...context.common.style, fill: { kind: 'solid', color: fill } });

  const nodes: RenderNode[] = [
    unseenHullNode(context),
    ...(groundShadow ? [groundShadow] : []),
    ...sides.flatMap((side, i) => [wallNode(context, side, i, fill), wallEdgesNode(context, side, i)]),
    topFace,
  ];
  return object.text ? [...nodes, ...labelNodes(context, object.text)] : nodes;
}
