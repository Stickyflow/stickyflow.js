import { AXIS_SIN } from '../../../model/isometricObject';
import type { SceneEllipse, ScenePath } from '../../scene';
import { finite } from '../../scene';
import { roundedPolygonPath } from '../../scene/roundedPolygonPath';
import type { IsometricContext, Point } from './context';

export function groundShadowNode(context: IsometricContext, topOutline: readonly Point[]): ScenePath | undefined {
  const { object, index, rotation, rotationCenter } = context;
  if (!object.hasShadow) {
    return undefined;
  }
  const height = Math.max(0, object.height);
  const heightFactor = 0.6 + Math.min(1, height / 150) * 0.7;
  const shadowDrop = height + finite(object.shadowStyle?.distance, 0);
  const contactFootprint = topOutline.map(point => ({ x: point.x, y: point.y + shadowDrop }));
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

export function sphereShadowNode(context: IsometricContext, radius: number): SceneEllipse | undefined {
  const { object, index, box } = context;
  if (!object.hasShadow) {
    return undefined;
  }
  const width = Math.max(0, object.width);
  const depth = Math.max(0, object.depth);
  const center = {
    x: box.x + box.width / 2,
    y: object.y + Math.max(0, object.height) + ((width + depth) * AXIS_SIN) / 2,
  };
  return {
    type: 'ellipse',
    id: `isometric-${object.id}-ground-shadow`,
    order: 14_000 + index,
    bounds: {
      minX: center.x - radius * 1.1,
      minY: center.y - radius * 0.6,
      maxX: center.x + radius * 1.1,
      maxY: center.y + radius * 0.6,
    },
    cx: center.x,
    cy: center.y,
    rx: radius * 1.05,
    ry: radius * 0.52,
    style: {
      fill: { kind: 'solid', color: object.shadowStyle?.color ?? '#000000' },
      stroke: { kind: 'none' },
      opacity: object.shadowStyle?.opacity ?? 0.2,
      blur: finite(object.shadowStyle?.blur, 8),
      pointerEvents: 'none',
    },
  };
}
