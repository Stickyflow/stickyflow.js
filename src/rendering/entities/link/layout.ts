import { type MeasureTextFactory, wrapText } from '../../../model/geometry/text';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash } from '../../../model/link/geometry';
import { getLinkStrokeColor } from '../../../model/links';
import { resolveShadow } from '../../../model/shadows';
import type { RenderInput } from '../../../renderInput/types';
import type { SceneStyle } from '../../scene';
import { DEFAULT_FONT, finite, orderOf } from '../../scene';
import type { LinkLabelLayout, LinkRenderContext } from './types';

function linkBounds(points: number[], padding: number) {
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  };
}

function labelLayout(link: RenderInput['links'][number]['link'], measureText?: MeasureTextFactory): LinkLabelLayout {
  const visible = Boolean(link.showText && link.text);
  const fontSize = finite(link.style?.fontSize, 10);
  const width = Math.min(250, Math.max(fontSize * 2, (link.text?.length ?? 0) * fontSize * 0.65 + 10));
  const metrics = measureText?.(link.style?.fontFamily ?? DEFAULT_FONT, fontSize);
  const lines = visible ? wrapText(link.text ?? '', width, fontSize, metrics) : [];
  return { visible, fontSize, width, height: lines.length * fontSize * 1.4, lines };
}

function linkStyle(
  item: RenderInput['links'][number],
  strokeWidth: number,
  color: string,
  dash: number[] | undefined,
): SceneStyle {
  const link = item.link;
  const stroke =
    typeof link.style?.color === 'object' && link.style.color.type === 'gradient'
      ? {
          kind: 'linear-gradient' as const,
          angle: 0,
          stops: link.style.color.stops.map(stop => ({ offset: stop.position, color: stop.color })),
        }
      : { kind: 'solid' as const, color };
  return {
    fill: { kind: 'none' },
    stroke,
    strokeWidth,
    dash,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: finite(link.style?.opacity, 1),
    shadow: resolveShadow(link.style?.shadow),
  };
}

export function createLinkRenderContext(
  item: RenderInput['links'][number],
  index: number,
  measureText?: MeasureTextFactory,
): LinkRenderContext {
  const { link, from, to } = item;
  const pathType = link.style?.pathType ?? 'orthogonal';
  const { points, segments } = getPathPoints(link, from, to, pathType);
  const strokeWidth = finite(link.style?.strokeWidth, 2);
  const color = getLinkStrokeColor(link.style?.color) || '#64748b';
  const label = labelLayout(link, measureText);
  const contentDash = getDashArray(strokeWidth, link.style?.strokeStyle ?? 'solid');
  const gap = label.visible && !contentDash ? labelGapDash(points, pathType, label.width, label.height) : null;
  const dash = gap ? [gap.dashBefore, gap.gapLength, 1e6] : contentDash;
  return {
    link,
    pathType,
    points,
    segments,
    midpoint: getLineMidpoint(points, pathType, from, to),
    strokeWidth,
    bounds: linkBounds(points, strokeWidth + 14),
    color,
    order: orderOf(link, 20_000 + index),
    style: linkStyle(item, strokeWidth, color, dash),
    label,
    hasLabelGap: Boolean(gap),
  };
}
