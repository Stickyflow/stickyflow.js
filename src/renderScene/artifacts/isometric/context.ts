import { type IsometricObject, isometricBounds, isometricFaces } from '../../../model/isometricObject';
import type { ScenePath } from '../../scene';
import { finite, rotatedBounds } from '../../scene';
import { roundedPolygonPath } from '../../scene/roundedPolygonPath';

export type Faces = ReturnType<typeof isometricFaces>;
export type Point = { x: number; y: number };
export type HullClip = { type: 'path'; d: string };
type PathStyle = NonNullable<ScenePath['style']>;

export interface IsometricContext {
  object: IsometricObject;
  index: number;
  order: number;
  rotation: number;
  rotationCenter: Point;
  box: ReturnType<typeof isometricBounds>;
  strokeWidth: number;
  common: {
    type: 'path';
    bounds: ReturnType<typeof rotatedBounds>;
    rotation: number;
    rotationCenter: Point;
    style: PathStyle;
  };
}

const FILL_PROP = { prop: 'style.fill', propKind: 'color' as const, propSolidOnly: true };

export function isometricContext(object: IsometricObject, index: number): IsometricContext {
  const strokeWidth = Math.max(0, finite(object.strokeWidth, 1));
  const rotation = finite(object.rotation, 0);
  const box = isometricBounds(object);
  const rotationCenter = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  return {
    object,
    index,
    order: 15_000 + index,
    rotation,
    rotationCenter,
    box,
    strokeWidth,
    common: {
      type: 'path' as const,
      bounds: rotatedBounds(box, rotation, strokeWidth + 2),
      rotation,
      rotationCenter,
      style: {
        stroke: { kind: 'solid' as const, color: object.strokeColor ?? '#111827' },
        strokeWidth,
        lineJoin: 'round' as const,
      },
    },
  };
}

export function faceNode(
  context: IsometricContext,
  name: string,
  offset: number,
  points: readonly Point[],
  style: PathStyle,
): ScenePath {
  return {
    ...context.common,
    id: `isometric-${context.object.id}-${name}`,
    order: context.order + offset,
    d: roundedPolygonPath([...points], 0),
    style,
    ...FILL_PROP,
  };
}

export function silhouette(object: IsometricObject): Point[] {
  const faces = isometricFaces(object);
  return [faces.top[0], faces.top[1], faces.right[2], faces.front[2], faces.front[3], faces.top[3]];
}

export function hullNode(context: IsometricContext, hullPath: string, cornerRadius: number): ScenePath {
  const { object, order, common, box } = context;
  return {
    ...common,
    id: `isometric-${object.id}-hull`,
    order: order + 0.24,
    d: hullPath,
    detail: {
      of: 'isometricGeometry',
      width: Math.max(0, object.width),
      height: Math.max(0, object.height),
      depth: Math.max(0, object.depth),
      cornerRadius,
      bounds: box,
      labelOffsetX: finite(object.labelOffsetX, 0),
      labelOffsetY: finite(object.labelOffsetY, 0),
    },
    style: { ...common.style, fill: { kind: 'none' } },
  };
}

export function unseenHullNode(context: IsometricContext): ScenePath {
  return {
    ...hullNode(context, roundedPolygonPath(silhouette(context.object), 0), 0),
    style: { ...context.common.style, fill: { kind: 'none' }, stroke: { kind: 'none' } },
  };
}
