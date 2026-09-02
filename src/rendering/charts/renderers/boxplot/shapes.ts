import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import type { ChartRenderContext } from '../types';
import type { BoxplotLayout, BoxplotSeriesMark } from './types';

interface BoxplotBorderLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  strokeWidth: number;
}

export function renderBoxAndWhiskers(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  mark: BoxplotSeriesMark,
): RenderNode[] {
  return [
    createBoxBorderLine(context, layout, lowerWhisker(mark)),
    createBoxBorderLine(context, layout, upperWhisker(mark)),
    createBoxBorderLine(context, layout, lowerWhiskerCap(mark, layout.boxWidth)),
    createBoxBorderLine(context, layout, upperWhiskerCap(mark, layout.boxWidth)),
    createBoxNode(context, layout, mark),
    createBoxBorderLine(context, layout, medianLine(mark, layout.boxWidth)),
  ];
}

function lowerWhisker(mark: BoxplotSeriesMark): BoxplotBorderLine {
  return {
    id: `chart-box-whisker-lo-${mark.id}`,
    from: { x: mark.geometry.centerX, y: mark.geometry.minY },
    to: { x: mark.geometry.centerX, y: mark.geometry.q1Y },
    strokeWidth: 1,
  };
}

function upperWhisker(mark: BoxplotSeriesMark): BoxplotBorderLine {
  return {
    id: `chart-box-whisker-hi-${mark.id}`,
    from: { x: mark.geometry.centerX, y: mark.geometry.q3Y },
    to: { x: mark.geometry.centerX, y: mark.geometry.maxY },
    strokeWidth: 1,
  };
}

function lowerWhiskerCap(mark: BoxplotSeriesMark, boxWidth: number): BoxplotBorderLine {
  return whiskerCap(`chart-box-cap-lo-${mark.id}`, mark.geometry.centerX, mark.geometry.minY, boxWidth);
}

function upperWhiskerCap(mark: BoxplotSeriesMark, boxWidth: number): BoxplotBorderLine {
  return whiskerCap(`chart-box-cap-hi-${mark.id}`, mark.geometry.centerX, mark.geometry.maxY, boxWidth);
}

function whiskerCap(id: string, centerX: number, y: number, boxWidth: number): BoxplotBorderLine {
  const capHalf = boxWidth * 0.2;
  return {
    id,
    from: { x: centerX - capHalf, y },
    to: { x: centerX + capHalf, y },
    strokeWidth: 1,
  };
}

function medianLine(mark: BoxplotSeriesMark, boxWidth: number): BoxplotBorderLine {
  return {
    id: `chart-box-median-${mark.id}`,
    from: { x: mark.geometry.centerX - boxWidth / 2, y: mark.geometry.medianY },
    to: { x: mark.geometry.centerX + boxWidth / 2, y: mark.geometry.medianY },
    strokeWidth: 2,
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
      stroke: { kind: 'solid', color: layout.borderColor },
      strokeWidth: line.strokeWidth,
    },
  };
}

function createBoxNode(context: ChartRenderContext, layout: BoxplotLayout, mark: BoxplotSeriesMark): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const { geometry } = mark;
  return {
    type: 'rect',
    id: `chart-box-${mark.id}`,
    order: nextOrder(),
    bounds,
    x: geometry.centerX - layout.boxWidth / 2,
    y: geometry.q3Y,
    width: layout.boxWidth,
    height: Math.max(1, geometry.q1Y - geometry.q3Y),
    rx: layout.cornerRadius,
    style: {
      fill: paint(mark.color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: layout.borderColor },
      strokeWidth: layout.borderWidth,
    },
  };
}
