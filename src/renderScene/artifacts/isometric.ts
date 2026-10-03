import { type IsometricObject, isometricFaces } from '../../model/isometricObject';
import type { RenderNode, SceneEllipse, ScenePath, SceneText } from '../scene';
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

  const groundShadow: SceneEllipse | undefined = object.hasShadow
    ? {
        type: 'ellipse',
        id: `isometric-${object.id}-ground-shadow`,
        order: order - 0.1,
        bounds: {
          minX: object.x + object.width * 0.15,
          minY: object.y + object.height - object.depth * 0.35,
          maxX: object.x + object.width * 0.85,
          maxY: object.y + object.height + object.depth * 0.35,
        },
        cx: object.x + object.width / 2,
        cy: object.y + object.height,
        rx: object.width * 0.35,
        ry: Math.max(3, object.depth * 0.35),
        rotation,
        style: {
          fill: { kind: 'solid', color: object.shadowStyle?.color ?? '#000000' },
          stroke: { kind: 'none' },
          opacity: object.shadowStyle?.opacity ?? 0.18,
          pointerEvents: 'none',
        },
      }
    : undefined;

  const noStroke = { ...common.style, stroke: { kind: 'none' as const } };

  const facesNodes: ScenePath[] = [
    {
      ...common,
      id: `isometric-${object.id}-top`,
      order,
      d: roundedPolygonPath(faces.top, [cornerRadius, cornerRadius, 0, cornerRadius]),
      style: { ...noStroke, fill: { kind: 'solid', color: object.topFill ?? '#f8fafc' } },
    },
    {
      ...common,
      id: `isometric-${object.id}-front`,
      order: order + 0.1,
      d: roundedPolygonPath(faces.front, [cornerRadius, 0, cornerRadius, cornerRadius]),
      style: { ...noStroke, fill: { kind: 'solid', color: object.frontFill ?? '#ffffff' } },
    },
    {
      ...common,
      id: `isometric-${object.id}-side`,
      order: order + 0.2,
      d: roundedPolygonPath(faces.side, [0, cornerRadius, cornerRadius, cornerRadius]),
      style: { ...noStroke, fill: { kind: 'solid', color: object.sideFill ?? '#f1f5f9' } },
    },
  ];

  // The three interior seams (where top meets front, front meets side, side
  // meets top) all converge on the near corner shared by all three faces -
  // drawn faint since the bold stroke belongs to the silhouette alone.
  const seams: ScenePath = {
    ...common,
    id: `isometric-${object.id}-seams`,
    order: order + 0.22,
    d: `M ${faces.top[3].x} ${faces.top[3].y} L ${faces.top[2].x} ${faces.top[2].y} L ${faces.top[1].x} ${faces.top[1].y} M ${faces.top[2].x} ${faces.top[2].y} L ${faces.front[2].x} ${faces.front[2].y}`,
    style: {
      ...common.style,
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#cbd5e1' },
      strokeWidth: Math.min(strokeWidth, 1),
    },
  };

  const silhouette = [faces.top[0], faces.top[1], faces.side[2], faces.front[2], faces.front[3], faces.top[3]];

  const hull: ScenePath = {
    ...common,
    id: `isometric-${object.id}-hull`,
    order: order + 0.24,
    d: roundedPolygonPath(silhouette, cornerRadius),
    style: { ...common.style, fill: { kind: 'none' } },
  };

  const objectNodes: RenderNode[] = groundShadow
    ? [groundShadow, ...facesNodes, seams, hull]
    : [...facesNodes, seams, hull];

  if (!object.text) {
    return objectNodes;
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

  const labelGuide: ScenePath = {
    type: 'path',
    id: `isometric-${object.id}-label-guide`,
    order: order + 0.25,
    bounds: {
      minX: object.x + object.width / 2,
      minY: object.y - labelGap,
      maxX: object.x + object.width / 2,
      maxY: object.y,
    },
    d: `M ${object.x + object.width / 2} ${object.y - labelGap} L ${object.x + object.width / 2} ${object.y}`,
    rotation,
    rotationCenter,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#cbd5e1' },
      strokeWidth: 1,
      lineCap: 'round',
      pointerEvents: 'none',
    },
  };

  return [...objectNodes, labelGuide, label];
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
