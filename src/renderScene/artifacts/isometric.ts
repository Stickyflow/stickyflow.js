import { isometricFaces, type IsometricObject } from '../../model/isometricObject';
import type { RenderNode, ScenePath, SceneText } from '../scene';
import { DEFAULT_FONT, finite, orderOf, rotatedBounds } from '../scene';
import { roundedPolygonPath } from '../scene/roundedPolygonPath';
import { tag } from '../scene/tagging';

export function buildIsometricObject(object: IsometricObject, index: number): RenderNode[] {
  const strokeWidth = Math.max(0, finite(object.strokeWidth, 1));
  const rotation = finite(object.rotation, 0);
  const rotationCenter = {
    x: object.x + object.width / 2,
    y: object.y + object.height / 2,
  };
  const bounds = rotatedBounds(object, rotation, strokeWidth + 2);
  const order = orderOf(object, 15_000 + index);
  const faces = isometricFaces(object);
  const cornerRadius = Math.max(0, finite(object.cornerRadius, 8));
  const common = {
    type: 'path' as const,
    bounds,
    rotation,
    rotationCenter,
    style: {
      stroke: { kind: 'solid' as const, color: object.strokeColor ?? '#111827' },
      strokeWidth,
      lineJoin: 'round' as const,
    },
  };

  const facesNodes: ScenePath[] = [
    {
      ...common,
      id: `isometric-${object.id}-top`,
      order,
      d: roundedPolygonPath(faces.top, [cornerRadius, cornerRadius, 0, cornerRadius]),
      style: { ...common.style, fill: { kind: 'solid', color: object.topFill ?? '#f8fafc' } },
    },
    {
      ...common,
      id: `isometric-${object.id}-front`,
      order: order + 0.1,
      d: roundedPolygonPath(faces.front, [cornerRadius, 0, cornerRadius, cornerRadius]),
      style: { ...common.style, fill: { kind: 'solid', color: object.frontFill ?? '#ffffff' } },
    },
    {
      ...common,
      id: `isometric-${object.id}-side`,
      order: order + 0.2,
      d: roundedPolygonPath(faces.side, [0, cornerRadius, cornerRadius, cornerRadius]),
      style: { ...common.style, fill: { kind: 'solid', color: object.sideFill ?? '#f1f5f9' } },
    },
  ];

  if (!object.text) {
    return facesNodes;
  }

  const labelHeight = 20;
  const labelGap = 12;
  const label: SceneText = {
    type: 'text',
    id: `isometric-${object.id}-label`,
    order: order + 0.3,
    bounds: {
      minX: object.x,
      minY: object.y - labelGap - labelHeight,
      maxX: object.x + object.width,
      maxY: object.y - labelGap,
    },
    x: object.x,
    y: object.y - labelGap - labelHeight,
    width: object.width,
    height: labelHeight,
    lines: [object.text],
    fontFamily: DEFAULT_FONT,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#111827',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    rotation,
    rotationCenter,
  };

  return [...facesNodes, label];
}

export function buildIsometricObjects(objects: readonly IsometricObject[]): RenderNode[] {
  return objects.flatMap((object, index) =>
    tag(
      buildIsometricObject(object, index),
      'isometric',
      object.id,
      'isometric',
      object.text ?? 'Isometric object',
      object.parentFrameId,
    ),
  );
}
