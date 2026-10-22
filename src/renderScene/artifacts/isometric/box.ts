import { deriveFaceFills, type IsometricObject, isometricFaces } from '../../../model/isometricObject';
import type { RenderNode, ScenePath } from '../../scene';
import { finite } from '../../scene';
import { roundedPolygonPath } from '../../scene/roundedPolygonPath';
import {
  type Faces,
  faceNode,
  type HullClip,
  hullNode,
  type IsometricContext,
  isometricContext,
  silhouette,
} from './context';
import { labelNodes } from './label';
import { groundShadowNode } from './shadow';

function faceNodes(context: IsometricContext, faces: Faces, hullClip: HullClip): ScenePath[] {
  const { object, common } = context;
  const noStroke = { ...common.style, stroke: { kind: 'none' as const } };
  const fills = deriveFaceFills(object.fill ?? '#f8fafc');
  const face = (name: string, offset: number, points: Faces['top'], color: string) =>
    faceNode(context, name, offset, points, { ...noStroke, fill: { kind: 'solid', color }, clip: hullClip });
  return [
    face('top', 0, faces.top, fills.topFill),
    face('front', 0.1, faces.front, fills.frontFill),
    face('side', 0.2, faces.right, fills.sideFill),
  ];
}

function seamsNode(context: IsometricContext, faces: Faces, hullClip: HullClip): ScenePath {
  const { object, order, common, strokeWidth } = context;
  return {
    ...common,
    id: `isometric-${object.id}-seams`,
    order: order + 0.22,
    d: `M ${faces.top[3].x} ${faces.top[3].y} L ${faces.top[2].x} ${faces.top[2].y} L ${faces.top[1].x} ${faces.top[1].y} M ${faces.top[2].x} ${faces.top[2].y} L ${faces.front[2].x} ${faces.front[2].y}`,
    style: {
      ...common.style,
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#cbd5e1' },
      strokeWidth: Math.min(strokeWidth, 1),
      clip: hullClip,
    },
  };
}

export function buildBox(object: IsometricObject, index: number): RenderNode[] {
  const context = isometricContext(object, index);
  const faces = isometricFaces(object);
  const cornerRadius = Math.max(0, finite(object.cornerRadius, 8));
  const hullPath = roundedPolygonPath(silhouette(object), cornerRadius);
  const hullClip: HullClip = { type: 'path', d: hullPath };

  const groundShadow = groundShadowNode(context, faces.top);
  const seams = seamsNode(context, faces, hullClip);
  const hull = hullNode(context, hullPath, cornerRadius);
  const facesNodes = faceNodes(context, faces, hullClip);
  const objectNodes: RenderNode[] = groundShadow
    ? [hull, ...facesNodes, groundShadow, seams]
    : [hull, ...facesNodes, seams];

  return object.text ? [...objectNodes, ...labelNodes(context, object.text)] : objectNodes;
}
