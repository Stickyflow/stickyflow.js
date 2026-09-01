import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../renderScene';
import type { ChartRenderContext } from '../types';
import type { BoxplotGeometry, BoxplotLayout } from './types';

export function renderBoxAndWhiskers(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  geometry: BoxplotGeometry,
  id: string,
  color: Parameters<typeof paint>[0],
): RenderNode[] {
  const capHalf = layout.boxWidth * 0.2;
  return [
    createBoxLine(
      context,
      layout,
      `chart-box-whisker-lo-${id}`,
      geometry.centerX,
      geometry.minY,
      geometry.centerX,
      geometry.q1Y,
      1,
    ),
    createBoxLine(
      context,
      layout,
      `chart-box-whisker-hi-${id}`,
      geometry.centerX,
      geometry.q3Y,
      geometry.centerX,
      geometry.maxY,
      1,
    ),
    createBoxLine(
      context,
      layout,
      `chart-box-cap-lo-${id}`,
      geometry.centerX - capHalf,
      geometry.minY,
      geometry.centerX + capHalf,
      geometry.minY,
      1,
    ),
    createBoxLine(
      context,
      layout,
      `chart-box-cap-hi-${id}`,
      geometry.centerX - capHalf,
      geometry.maxY,
      geometry.centerX + capHalf,
      geometry.maxY,
      1,
    ),
    createBoxNode(context, layout, geometry, id, color),
    createBoxLine(
      context,
      layout,
      `chart-box-median-${id}`,
      geometry.centerX - layout.boxWidth / 2,
      geometry.medianY,
      geometry.centerX + layout.boxWidth / 2,
      geometry.medianY,
      2,
    ),
  ];
}

function createBoxLine(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): RenderNode {
  return {
    type: 'path',
    id,
    order: context.nextOrder(),
    bounds: context.bounds,
    d: `M ${x1} ${y1} L ${x2} ${y2}`,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: layout.borderColor },
      strokeWidth: width,
    },
  };
}

function createBoxNode(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  geometry: BoxplotGeometry,
  id: string,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-box-${id}`,
    order: nextOrder(),
    bounds,
    x: geometry.centerX - layout.boxWidth / 2,
    y: geometry.q3Y,
    width: layout.boxWidth,
    height: Math.max(1, geometry.q1Y - geometry.q3Y),
    rx: layout.cornerRadius,
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: layout.borderColor },
      strokeWidth: layout.borderWidth,
    },
  };
}
