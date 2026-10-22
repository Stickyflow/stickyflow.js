import { type Dimension, dimensionGeometry, dimensionText } from '../../model/dimension';
import type { Point } from '../../model/geometry/types';
import type { RenderNode, ScenePath, SceneText } from '../scene';
import { DEFAULT_FONT, finite } from '../scene';
import { tag } from '../scene/tagging';

const DEFAULT_COLOR = '#475569';
const CHAR_WIDTH = 0.6;

type Segment = readonly [Point, Point];

const pathData = (segments: readonly Segment[]): string =>
  segments.map(([from, to]) => `M ${from.x} ${from.y} L ${to.x} ${to.y}`).join(' ');

function pathNode(dimension: Dimension, name: string, order: number, segments: readonly Segment[]): ScenePath {
  const strokeWidth = Math.max(0, finite(dimension.strokeWidth, 1));
  const points = segments.flat();
  return {
    type: 'path',
    id: `dimension-${dimension.id}-${name}`,
    order,
    bounds: {
      minX: Math.min(...points.map(point => point.x)) - strokeWidth,
      minY: Math.min(...points.map(point => point.y)) - strokeWidth,
      maxX: Math.max(...points.map(point => point.x)) + strokeWidth,
      maxY: Math.max(...points.map(point => point.y)) + strokeWidth,
    },
    d: pathData(segments),
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: dimension.strokeColor ?? DEFAULT_COLOR },
      strokeWidth,
      lineCap: 'round',
    },
  };
}

function labelNode(dimension: Dimension, order: number, text: string, center: Point, angle: number): SceneText {
  const fontSize = finite(dimension.fontSize, 11);
  const width = Math.max(24, text.length * fontSize * CHAR_WIDTH + 8);
  const height = fontSize * 1.3;
  return {
    type: 'text',
    id: `dimension-${dimension.id}-label`,
    order,
    bounds: {
      minX: center.x - width / 2,
      minY: center.y - height / 2,
      maxX: center.x + width / 2,
      maxY: center.y + height / 2,
    },
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    lines: [text],
    fontFamily: DEFAULT_FONT,
    fontSize,
    fontWeight: 'normal',
    color: dimension.textColor ?? dimension.strokeColor ?? DEFAULT_COLOR,
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    rotation: angle,
    rotationCenter: center,
  };
}

export function buildDimension(dimension: Dimension, index: number): RenderNode[] {
  const geometry = dimensionGeometry(dimension);
  const order = 31_000 + index;
  const line: ScenePath = {
    ...pathNode(dimension, 'line', order + 0.1, [geometry.line]),
    markerStart: 'filled_arrow',
    markerEnd: 'filled_arrow',
  };
  const extensions =
    geometry.extensions.length > 0 ? [pathNode(dimension, 'extensions', order, geometry.extensions)] : [];
  const text = dimensionText(dimension);
  return [...extensions, line, labelNode(dimension, order + 0.2, text, geometry.label.center, geometry.label.angle)];
}

export function buildDimensions(dimensions: readonly Dimension[]): RenderNode[] {
  return dimensions.flatMap((dimension, index) =>
    tag(
      buildDimension(dimension, index),
      'dimension',
      dimension.id,
      'dimension',
      dimensionText(dimension),
      dimension.parentFrameId,
    ),
  );
}
