import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { boxplotPoint } from './geometry';
import type { BoxplotLayout, BoxplotSeriesMark } from './types';

interface BoxplotBorderLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  strokeWidth: number;
  color?: string;
}

export function renderBoxAndWhiskers(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  mark: BoxplotSeriesMark,
): RenderNode[] {
  const whiskers = layout.whiskerWidth > 0 ? [lowerWhisker(layout, mark), upperWhisker(layout, mark)] : [];
  const caps =
    layout.whiskerWidth > 0 && layout.capSize > 0 ? [lowerWhiskerCap(layout, mark), upperWhiskerCap(layout, mark)] : [];
  const median = layout.medianWidth > 0 ? [medianLine(layout, mark)] : [];
  return [
    ...[...whiskers, ...caps].map(line =>
      createBoxBorderLine(context, layout, { ...line, color: whiskerColor(layout, mark) }),
    ),
    createBoxNode(context, layout, mark),
    ...median.map(line => createBoxBorderLine(context, layout, line)),
  ];
}

function whiskerColor(layout: BoxplotLayout, mark: BoxplotSeriesMark): string | undefined {
  if (layout.whiskerColor === 'series') {
    return representativeColor(mark.color, layout.borderColor);
  }
  return layout.whiskerColor;
}

function lowerWhisker(layout: BoxplotLayout, mark: BoxplotSeriesMark): BoxplotBorderLine {
  const { center, min, q1 } = mark.geometry;
  return {
    id: `chart-box-whisker-lo-${mark.id}`,
    from: boxplotPoint(layout.orientation, center, min),
    to: boxplotPoint(layout.orientation, center, q1),
    strokeWidth: layout.whiskerWidth,
  };
}

function upperWhisker(layout: BoxplotLayout, mark: BoxplotSeriesMark): BoxplotBorderLine {
  const { center, q3, max } = mark.geometry;
  return {
    id: `chart-box-whisker-hi-${mark.id}`,
    from: boxplotPoint(layout.orientation, center, q3),
    to: boxplotPoint(layout.orientation, center, max),
    strokeWidth: layout.whiskerWidth,
  };
}

function lowerWhiskerCap(layout: BoxplotLayout, mark: BoxplotSeriesMark): BoxplotBorderLine {
  return whiskerCap(`chart-box-cap-lo-${mark.id}`, layout, mark.geometry.center, mark.geometry.min);
}

function upperWhiskerCap(layout: BoxplotLayout, mark: BoxplotSeriesMark): BoxplotBorderLine {
  return whiskerCap(`chart-box-cap-hi-${mark.id}`, layout, mark.geometry.center, mark.geometry.max);
}

function whiskerCap(id: string, layout: BoxplotLayout, center: number, value: number): BoxplotBorderLine {
  const capHalf = (layout.boxWidth * layout.capSize) / 2;
  return {
    id,
    from: boxplotPoint(layout.orientation, center - capHalf, value),
    to: boxplotPoint(layout.orientation, center + capHalf, value),
    strokeWidth: layout.whiskerWidth,
  };
}

function medianLine(layout: BoxplotLayout, mark: BoxplotSeriesMark): BoxplotBorderLine {
  const half = layout.boxWidth / 2;
  return {
    id: `chart-box-median-${mark.id}`,
    from: boxplotPoint(layout.orientation, mark.geometry.center - half, mark.geometry.median),
    to: boxplotPoint(layout.orientation, mark.geometry.center + half, mark.geometry.median),
    strokeWidth: layout.medianWidth,
    color: layout.medianColor,
  };
}

function createBoxBorderLine(context: ChartRenderContext, layout: BoxplotLayout, line: BoxplotBorderLine): RenderNode {
  return {
    type: 'path',
    id: line.id,
    order: context.nextOrder(),
    bounds: context.bounds,
    d: `M ${line.from.x} ${line.from.y} L ${line.to.x} ${line.to.y}`,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: line.color ?? layout.borderColor },
      strokeWidth: line.strokeWidth,
    },
  };
}

function createBoxNode(context: ChartRenderContext, layout: BoxplotLayout, mark: BoxplotSeriesMark): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const { geometry } = mark;
  const half = layout.boxWidth / 2;
  const a = boxplotPoint(layout.orientation, geometry.center - half, geometry.q1);
  const b = boxplotPoint(layout.orientation, geometry.center + half, geometry.q3);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.max(1, Math.abs(b.x - a.x));
  const height = Math.max(1, Math.abs(b.y - a.y));
  return {
    type: 'rect',
    id: `chart-box-${mark.id}`,
    order: nextOrder(),
    bounds,
    x,
    y,
    width,
    height,
    rx: layout.cornerRadius,
    style: {
      fill: paint(mark.color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: layout.borderColor },
      strokeWidth: layout.borderWidth,
    },
  };
}
