import { isometricFaces, type IsometricObject } from '../../model/isometricObject';
import type { Point } from '../../model/geometry/types';
import type { RenderNode, ScenePath } from '../scene';
import { finite, orderOf, rotatedBounds } from '../scene';
import { tag } from '../scene/tagging';

function polygonPath(points: readonly Point[]): string {
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map(point => `L ${point.x} ${point.y}`).join(' ')} Z`;
}

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

  const nodes: ScenePath[] = [
    {
      ...common,
      id: `isometric-${object.id}-top`,
      order,
      d: polygonPath(faces.top),
      style: { ...common.style, fill: { kind: 'solid', color: object.topFill ?? '#f8fafc' } },
    },
    {
      ...common,
      id: `isometric-${object.id}-front`,
      order: order + 0.1,
      d: polygonPath(faces.front),
      style: { ...common.style, fill: { kind: 'solid', color: object.frontFill ?? '#ffffff' } },
    },
    {
      ...common,
      id: `isometric-${object.id}-side`,
      order: order + 0.2,
      d: polygonPath(faces.side),
      style: { ...common.style, fill: { kind: 'solid', color: object.sideFill ?? '#f1f5f9' } },
    },
  ];

  return nodes;
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
