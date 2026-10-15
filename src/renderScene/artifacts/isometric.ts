import {
  deriveFaceFills,
  type IsometricObject,
  isometricBounds,
  isometricFaces,
  isometricTopFaceCenter,
} from '../../model/isometricObject';
import type { RenderNode, ScenePath, SceneRect, SceneText } from '../scene';
import { DEFAULT_FONT, finite, rotatedBounds } from '../scene';
import { roundedPolygonPath } from '../scene/roundedPolygonPath';
import { tag } from '../scene/tagging';

type Faces = ReturnType<typeof isometricFaces>;
type Point = { x: number; y: number };
type HullClip = { type: 'path'; d: string };

interface IsometricContext {
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
    style: NonNullable<ScenePath['style']>;
  };
}

function isometricContext(object: IsometricObject, index: number): IsometricContext {
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

function groundShadowNode(context: IsometricContext, faces: Faces): ScenePath | undefined {
  const { object, index, rotation, rotationCenter } = context;
  if (!object.hasShadow) {
    return undefined;
  }
  const height = Math.max(0, object.height);
  const heightFactor = 0.6 + Math.min(1, height / 150) * 0.7;
  const shadowDrop = height + finite(object.shadowStyle?.distance, 0);
  const contactFootprint = faces.top.map(point => ({ x: point.x, y: point.y + shadowDrop }));
  const footprintCenter = {
    x: contactFootprint.reduce((sum, point) => sum + point.x, 0) / contactFootprint.length,
    y: contactFootprint.reduce((sum, point) => sum + point.y, 0) / contactFootprint.length,
  };
  const shadowSpread = 1.3;
  const footprint = contactFootprint.map(point => ({
    x: footprintCenter.x + (point.x - footprintCenter.x) * shadowSpread,
    y: footprintCenter.y + (point.y - footprintCenter.y) * shadowSpread,
  }));
  const footprintXs = footprint.map(point => point.x);
  const footprintYs = footprint.map(point => point.y);
  return {
    type: 'path',
    id: `isometric-${object.id}-ground-shadow`,
    order: 14_000 + index,
    bounds: {
      minX: Math.min(...footprintXs),
      minY: Math.min(...footprintYs),
      maxX: Math.max(...footprintXs),
      maxY: Math.max(...footprintYs),
    },
    d: roundedPolygonPath(footprint, 0),
    rotation,
    rotationCenter,
    style: {
      fill: { kind: 'solid', color: object.shadowStyle?.color ?? '#000000' },
      stroke: { kind: 'none' },
      opacity: Math.min(1, (object.shadowStyle?.opacity ?? 0.18) * heightFactor),
      blur: finite(object.shadowStyle?.blur, 8),
      pointerEvents: 'none',
    },
  };
}

function faceNodes(context: IsometricContext, faces: Faces, hullClip: HullClip): ScenePath[] {
  const { object, order, common } = context;
  const noStroke = { ...common.style, stroke: { kind: 'none' as const } };
  const faceFills = deriveFaceFills(object.fill ?? '#f8fafc');
  const colorProp = { prop: 'style.fill', propKind: 'color' as const, propSolidOnly: true };
  const face = (name: string, offset: number, points: Faces['top'], color: string): ScenePath => ({
    ...common,
    id: `isometric-${object.id}-${name}`,
    order: order + offset,
    d: roundedPolygonPath(points, 0),
    style: { ...noStroke, fill: { kind: 'solid', color }, clip: hullClip },
    ...colorProp,
  });
  return [
    face('top', 0, faces.top, faceFills.topFill),
    face('front', 0.1, faces.front, faceFills.frontFill),
    face('side', 0.2, faces.right, faceFills.sideFill),
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

function hullNode(context: IsometricContext, hullPath: string, cornerRadius: number): ScenePath {
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

const LABEL_HEIGHT = 20;
const LABEL_GAP = 12;
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 3;
const LABEL_CHAR_WIDTH = 6.5;

function labelNodes(context: IsometricContext, text: string): RenderNode[] {
  const { object, order, rotation, rotationCenter, box } = context;
  const anchor = isometricTopFaceCenter(object);
  const labelCenterX = anchor.x + finite(object.labelOffsetX, 0);
  const labelBottomY = anchor.y - LABEL_GAP + finite(object.labelOffsetY, 0);
  const labelTopY = labelBottomY - LABEL_HEIGHT;
  const label: SceneText = {
    type: 'text',
    id: `isometric-${object.id}-label`,
    order: order + 0.3,
    bounds: {
      minX: labelCenterX - box.width / 2,
      minY: labelTopY,
      maxX: labelCenterX + box.width / 2,
      maxY: labelBottomY,
    },
    x: labelCenterX - box.width / 2,
    y: labelTopY,
    width: box.width,
    height: LABEL_HEIGHT,
    lines: [text],
    fontFamily: DEFAULT_FONT,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#111827',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    rotation,
    rotationCenter,
    mark: 'isometric-label',
  };
  const labelGuide: ScenePath = {
    type: 'path',
    id: `isometric-${object.id}-label-guide`,
    order: order + 0.25,
    bounds: {
      minX: Math.min(anchor.x, labelCenterX),
      minY: Math.min(anchor.y, labelBottomY),
      maxX: Math.max(anchor.x, labelCenterX),
      maxY: Math.max(anchor.y, labelBottomY),
    },
    d: `M ${anchor.x} ${anchor.y} L ${labelCenterX} ${labelBottomY}`,
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
  if (!object.labelBackground) {
    return [labelGuide, label];
  }
  const backgroundWidth = Math.max(24, text.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X * 2);
  const labelBackground: SceneRect = {
    type: 'rect',
    id: `isometric-${object.id}-label-background`,
    order: order + 0.28,
    x: labelCenterX - backgroundWidth / 2,
    y: labelTopY - LABEL_PADDING_Y,
    width: backgroundWidth,
    height: LABEL_HEIGHT + LABEL_PADDING_Y * 2,
    rx: 4,
    bounds: {
      minX: labelCenterX - backgroundWidth / 2,
      minY: labelTopY - LABEL_PADDING_Y,
      maxX: labelCenterX + backgroundWidth / 2,
      maxY: labelBottomY + LABEL_PADDING_Y,
    },
    rotation,
    mark: 'isometric-label',
    style: {
      fill: { kind: 'solid', color: object.labelBackground },
      stroke: { kind: 'none' },
    },
  };
  return [labelGuide, labelBackground, label];
}

export function buildIsometricObject(object: IsometricObject, index: number): RenderNode[] {
  const context = isometricContext(object, index);
  const faces = isometricFaces(object);
  const cornerRadius = Math.max(0, finite(object.cornerRadius, 8));
  const silhouette = [faces.top[0], faces.top[1], faces.right[2], faces.front[2], faces.front[3], faces.top[3]];
  const hullPath = roundedPolygonPath(silhouette, cornerRadius);
  const hullClip: HullClip = { type: 'path', d: hullPath };

  const groundShadow = groundShadowNode(context, faces);
  const seams = seamsNode(context, faces, hullClip);
  const hull = hullNode(context, hullPath, cornerRadius);
  const facesNodes = faceNodes(context, faces, hullClip);
  const objectNodes: RenderNode[] = groundShadow
    ? [hull, ...facesNodes, groundShadow, seams]
    : [hull, ...facesNodes, seams];

  return object.text ? [...objectNodes, ...labelNodes(context, object.text)] : objectNodes;
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
