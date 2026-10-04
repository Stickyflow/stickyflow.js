import {
  deriveFaceFills,
  type IsometricObject,
  isometricBounds,
  isometricFaces,
  isometricTopFaceCenter,
} from '../../model/isometricObject';
import type { RenderNode, ScenePath, SceneRect, SceneText } from '../scene';
import { DEFAULT_FONT, finite, orderOf, rotatedBounds } from '../scene';
import { roundedPolygonPath } from '../scene/roundedPolygonPath';
import { tag } from '../scene/tagging';

export function buildIsometricObject(object: IsometricObject, index: number): RenderNode[] {
  const strokeWidth = Math.max(0, finite(object.strokeWidth, 1));
  const rotation = finite(object.rotation, 0);
  const box = isometricBounds(object);
  const rotationCenter = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  const bounds = rotatedBounds(box, rotation, strokeWidth + 2);
  const order = orderOf(object, 15_000 + index);
  const faces = isometricFaces(object);
  const cornerRadius = Math.max(0, finite(object.cornerRadius, 8));
  const depth = Math.max(0, object.depth);
  const height = Math.max(0, object.height);
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

  const heightFactor = 0.6 + Math.min(1, height / 150) * 0.7;
  // Always drops at least to the object's own base (height), plus an
  // optional extra gap - positive distance always pushes the shadow further
  // away from the object, never closer, regardless of how tall it is.
  const shadowDrop = height + finite(object.shadowStyle?.distance, 0);
  // The footprint on the ground is the same rhombus as the top face, just
  // carried straight down by shadowDrop - that keeps it following the true
  // 30deg/150deg isometric axes (independently stretched by width and
  // depth) instead of a fixed-orientation ellipse that only ever grows
  // horizontally.
  const contactFootprint = faces.top.map(point => ({ x: point.x, y: point.y + shadowDrop }));
  // The exact contact footprint is pixel-for-pixel the same quad as the
  // bottom edge of the object's own opaque front/side faces, so it's fully
  // hidden behind them - scaled outward from its own centroid so it pokes
  // out past the silhouette the way a cast shadow actually would.
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
  const groundShadow: ScenePath | undefined = object.hasShadow
    ? {
        type: 'path',
        id: `isometric-${object.id}-ground-shadow`,
        // A dedicated layer strictly below every isometric object's own
        // hull/faces (which start at 15_000+i) - a shadow must never paint
        // in front of another object's body, regardless of declaration
        // order or how far its footprint stretches.
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
      }
    : undefined;

  const noStroke = { ...common.style, stroke: { kind: 'none' as const } };
  const silhouette = [faces.top[0], faces.top[1], faces.right[2], faces.front[2], faces.front[3], faces.top[3]];
  const hullPath = roundedPolygonPath(silhouette, cornerRadius);
  const hullClip = { type: 'path' as const, d: hullPath };

  // One color in, a consistent three-face cube out - front/side are always
  // derived shades of the same fill, never independently chosen, so they
  // can't drift out of sync with each other.
  const faceFills = deriveFaceFills(object.fill ?? '#f8fafc');
  const colorProp = { prop: 'style.fill', propKind: 'color' as const, propSolidOnly: true };

  const facesNodes: ScenePath[] = [
    {
      ...common,
      id: `isometric-${object.id}-top`,
      order,
      d: roundedPolygonPath(faces.top, 0),
      style: { ...noStroke, fill: { kind: 'solid', color: faceFills.topFill }, clip: hullClip },
      ...colorProp,
    },
    {
      ...common,
      id: `isometric-${object.id}-front`,
      order: order + 0.1,
      d: roundedPolygonPath(faces.front, 0),
      style: { ...noStroke, fill: { kind: 'solid', color: faceFills.frontFill }, clip: hullClip },
      ...colorProp,
    },
    {
      ...common,
      id: `isometric-${object.id}-side`,
      order: order + 0.2,
      d: roundedPolygonPath(faces.right, 0),
      style: { ...noStroke, fill: { kind: 'solid', color: faceFills.sideFill }, clip: hullClip },
      ...colorProp,
    },
  ];

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
      clip: hullClip,
    },
  };

  const hull: ScenePath = {
    ...common,
    id: `isometric-${object.id}-hull`,
    order: order + 0.24,
    d: hullPath,
    detail: {
      of: 'isometricGeometry',
      width: Math.max(0, object.width),
      height,
      depth,
      cornerRadius,
      bounds: box,
      labelOffsetX: finite(object.labelOffsetX, 0),
      labelOffsetY: finite(object.labelOffsetY, 0),
    },
    style: { ...common.style, fill: { kind: 'none' } },
  };

  const objectNodes: RenderNode[] = groundShadow
    ? [hull, ...facesNodes, groundShadow, seams]
    : [hull, ...facesNodes, seams];

  if (!object.text) {
    return objectNodes;
  }

  const labelHeight = 20;
  const labelGap = 12;
  const labelPaddingX = 6;
  const labelPaddingY = 3;
  const anchor = isometricTopFaceCenter(object);
  const labelCenterX = anchor.x + finite(object.labelOffsetX, 0);
  const labelBottomY = anchor.y - labelGap + finite(object.labelOffsetY, 0);
  const labelTopY = labelBottomY - labelHeight;
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
    return [...objectNodes, labelGuide, label];
  }

  const labelCharWidth = 6.5;
  const backgroundWidth = Math.max(24, object.text.length * labelCharWidth + labelPaddingX * 2);
  const labelBackground: SceneRect = {
    type: 'rect',
    id: `isometric-${object.id}-label-background`,
    order: order + 0.28,
    x: labelCenterX - backgroundWidth / 2,
    y: labelTopY - labelPaddingY,
    width: backgroundWidth,
    height: labelHeight + labelPaddingY * 2,
    rx: 4,
    bounds: {
      minX: labelCenterX - backgroundWidth / 2,
      minY: labelTopY - labelPaddingY,
      maxX: labelCenterX + backgroundWidth / 2,
      maxY: labelBottomY + labelPaddingY,
    },
    rotation,
    mark: 'isometric-label',
    style: {
      fill: { kind: 'solid', color: object.labelBackground },
      stroke: { kind: 'none' },
    },
  };

  return [...objectNodes, labelGuide, labelBackground, label];
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
