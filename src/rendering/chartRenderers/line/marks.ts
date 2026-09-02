import type { ChartSeries } from '../../../model/charts';
import {
  createVerticalErrorWhiskerNode,
  errorBarRange,
  mapChartValue,
  representativeColor,
} from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { CartesianPoint } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';

export interface LinePointMark {
  seriesId: string;
  valueIndex: number;
  value: number;
  error: number | [number, number] | null | undefined;
  position: CartesianPoint;
  color: NonNullable<ChartSeries['color']>;
}

export function createLinePointMarks(
  series: ChartSeries,
  pairs: [number, number][],
  points: CartesianPoint[],
  color: NonNullable<ChartSeries['color']>,
): LinePointMark[] {
  return points.map((position, valueIndex) => ({
    seriesId: series.id,
    valueIndex,
    value: pairs[valueIndex][1],
    error: series.error?.[valueIndex],
    position,
    color,
  }));
}

export function renderLineMarks(context: ChartRenderContext, marks: LinePointMark[]): RenderNode[] {
  return marks.flatMap(mark => renderLinePointMark(context, mark));
}

function renderLinePointMark(context: ChartRenderContext, mark: LinePointMark): RenderNode[] {
  const nodes: RenderNode[] = [];
  const errorNode = createLineError(context, mark);
  if (errorNode) {
    nodes.push(errorNode);
  }
  nodes.push(createLinePoint(context, mark));
  return nodes;
}

function createLineError(context: ChartRenderContext, mark: LinePointMark): RenderNode | null {
  if (mark.error == null) {
    return null;
  }
  const { chart, plot, bounds, nextOrder } = context;
  const [lower, upper] = errorBarRange(mark.value, mark.error);
  return createVerticalErrorWhiskerNode({
    id: `chart-line-error-${chart.id}-${mark.seriesId}-${mark.valueIndex}`,
    order: nextOrder(),
    bounds,
    geometry: {
      centerX: mark.position.x,
      startY: plot.y + plot.height - mapChartValue(lower, chart.axis_y, plot.height),
      endY: plot.y + plot.height - mapChartValue(upper, chart.axis_y, plot.height),
    },
    color: representativeColor(mark.color, '#0f172a'),
    valueReference: { seriesId: mark.seriesId, valueIndex: mark.valueIndex },
  });
}

function createLinePoint(context: ChartRenderContext, mark: LinePointMark): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'ellipse',
    id: `chart-point-${chart.id}-${mark.seriesId}-${mark.valueIndex}`,
    order: nextOrder(),
    bounds,
    cx: mark.position.x,
    cy: mark.position.y,
    rx: 3,
    ry: 3,
    detail: { of: 'chartValue', series: mark.seriesId, valueIndex: mark.valueIndex },
    style: { fill: paint(mark.color, diagnostics, chart.id) },
  };
}
