import {
  getDashArray,
  getLineMidpoint,
  getPathPoints,
  labelGapDash,
  roundedOrthogonalPathData,
} from '../../model/geometry/connectionLine';
import type { PathSegment } from '../../model/geometry/router';
import { type MeasureTextFactory, wrapText } from '../../model/geometry/text';
import type { Link, MarkerType } from '../../model/links';
import { getLinkStrokeColor } from '../../model/links';
import { DEFAULT_FONT, finite, orderOf } from '../renderPrimitives';
import type { RenderInput, RenderNode, ScenePath, SceneStyle } from '../renderScene';

function marker(link: Link, end: 'start' | 'end'): MarkerType {
  const explicit = end === 'start' ? (link.startMarker ?? link.start_marker) : (link.endMarker ?? link.end_marker);
  if (explicit) return explicit;
  const direction = link.style?.arrowDirection ?? 'forward';
  if (direction === 'bidirectional') return 'arrow';
  if (end === 'start' && direction === 'backward') return 'arrow';
  if (end === 'end' && direction === 'forward') return 'arrow';
  return 'none';
}

function pathData(points: number[], pathType: string, segments: PathSegment[], strokeWidth: number): string {
  if (points.length < 4) return '';
  if (pathType === 'curved' && points.length >= 8)
    return `M ${points[0]} ${points[1]} C ${points[2]} ${points[3]} ${points[4]} ${points[5]} ${points[6]} ${points[7]}`;
  if (pathType === 'orthogonal' && segments.length) {
    return roundedOrthogonalPathData(segments, Math.max(16, strokeWidth * 4));
  }
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`;
  return d;
}

function endpointLabelPosition(points: number[], end: 'start' | 'end') {
  const index = end === 'start' ? 0 : points.length - 2;
  const neighbor = end === 'start' ? 2 : points.length - 4;
  const x = points[index],
    y = points[index + 1];
  const dx = points[neighbor] - x,
    dy = points[neighbor + 1] - y;
  const length = Math.hypot(dx, dy) || 1,
    ux = dx / length,
    uy = dy / length;
  return { x: x + ux * 20 - uy * 13, y: y + uy * 20 + ux * 13 };
}

export function buildLink(
  item: RenderInput['links'][number],
  index: number,
  measureText?: MeasureTextFactory,
): RenderNode[] {
  const { link, from, to } = item;
  if (link.is_visible === false || link.isVisible === false) return [];
  const pathType = link.style?.pathType ?? 'orthogonal';
  const { points, segments } = getPathPoints(link, from, to, pathType);
  const midpoint = getLineMidpoint(points, pathType, from, to);
  const strokeWidth = finite(link.style?.strokeWidth, 2),
    extra = strokeWidth + 14;
  const xs = points.filter((_, i) => i % 2 === 0),
    ys = points.filter((_, i) => i % 2 === 1);
  const bounds = {
    minX: Math.min(...xs) - extra,
    minY: Math.min(...ys) - extra,
    maxX: Math.max(...xs) + extra,
    maxY: Math.max(...ys) + extra,
  };
  const color = getLinkStrokeColor(link.style?.color) || '#64748b';

  const hasLabel = !!(link.showText && link.text);
  const fontSize = finite(link.style?.fontSize, 10);
  const labelWidth = Math.min(250, Math.max(fontSize * 2, (link.text?.length ?? 0) * fontSize * 0.65 + 10));
  const labelMetrics = measureText?.(link.style?.fontFamily ?? DEFAULT_FONT, fontSize);
  const wrappedLines = hasLabel ? wrapText(link.text!, labelWidth, fontSize, labelMetrics) : [];
  const labelHeight = wrappedLines.length * fontSize * 1.4;

  const contentDash = getDashArray(strokeWidth, link.style?.strokeStyle ?? 'solid');
  const gap = hasLabel && !contentDash ? labelGapDash(points, pathType, labelWidth, labelHeight) : null;
  const dash = gap ? [gap.dashBefore, gap.gapLength, 1e6] : contentDash;

  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke:
      typeof link.style?.color === 'object' && link.style.color.type === 'gradient'
        ? {
            kind: 'linear-gradient',
            angle: 0,
            stops: link.style.color.stops.map(s => ({ offset: s.position, color: s.color })),
          }
        : { kind: 'solid', color },
    strokeWidth,
    dash,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: finite(link.style?.opacity, 1),
  };
  const order = orderOf(link, 20_000 + index);
  const path: ScenePath = {
    type: 'path',
    id: `link-${link.id}`,
    order,
    bounds,
    d: pathData(points, pathType, segments, strokeWidth),
    style,
    markerStart: marker(link, 'start'),
    markerEnd: marker(link, 'end'),
    sfFromId: link.fromId,
    sfToId: link.toId,
    sfRoute: pathType,
    sfFromSide: link.fromPoint && 'side' in link.fromPoint ? link.fromPoint.side : undefined,
    sfToSide: link.toPoint && 'side' in link.toPoint ? link.toPoint.side : undefined,
    sfLabelGap: !!gap,
  };
  const nodes: RenderNode[] = [path];
  if (hasLabel) {
    nodes.push({
      type: 'text',
      id: `link-text-${link.id}`,
      order: order + 0.5,
      bounds,
      x: midpoint.x - labelWidth / 2,
      y: midpoint.y - fontSize,
      width: labelWidth,
      height: fontSize * 2,
      lines: wrappedLines,
      fontFamily: link.style?.fontFamily ?? DEFAULT_FONT,
      fontSize,
      fontWeight: 'normal',
      color,
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.4,
    });
  }
  const showWeight = link.weight !== undefined && link.weight !== null && link.showWeight !== false;
  if (showWeight) {
    const weightValue = link.weight ?? 0;
    const badgeText = weightValue.toFixed(1);
    const badgeWidth = Math.max(30, badgeText.length * 8 + 12);
    const badgeHeight = 16;
    const badgeY = midpoint.y + (hasLabel ? labelHeight / 2 + 10 : 0);
    nodes.push({
      type: 'rect',
      id: `link-weight-badge-${link.id}`,
      order: order + 0.6,
      bounds,
      x: midpoint.x - badgeWidth / 2,
      y: badgeY - badgeHeight / 2,
      width: badgeWidth,
      height: badgeHeight,
      rx: badgeHeight / 2,
      style: { fill: { kind: 'solid', color }, stroke: { kind: 'none' }, opacity: 0.92 },
    });
    nodes.push({
      type: 'text',
      id: `link-weight-${link.id}`,
      order: order + 0.61,
      bounds,
      x: midpoint.x - badgeWidth / 2,
      y: badgeY - badgeHeight / 2,
      width: badgeWidth,
      height: badgeHeight,
      lines: [badgeText],
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      color: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1,
    });
  }
  const endpointFontSize = finite(link.style?.fontSize, 10);
  (['start', 'end'] as const).forEach((end, labelIndex) => {
    const label = (end === 'start' ? link.style?.startLabel : link.style?.endLabel)?.trim();
    if (!label) return;
    const position = endpointLabelPosition(points, end),
      width = 90;
    nodes.push({
      type: 'text',
      id: `link-${end}-label-${link.id}`,
      order: order + 0.55 + labelIndex * 0.01,
      bounds,
      x: position.x - width / 2,
      y: position.y - endpointFontSize,
      width,
      height: endpointFontSize * 2,
      lines: [label],
      fontFamily: link.style?.fontFamily ?? DEFAULT_FONT,
      fontSize: endpointFontSize,
      fontWeight: 'normal',
      color,
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.4,
    });
  });
  return nodes;
}
