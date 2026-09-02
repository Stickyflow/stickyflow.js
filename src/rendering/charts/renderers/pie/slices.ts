import type { ChartSeries } from '../../../../model/charts';
import { finite, paint } from '../../../renderPrimitives';
import type { RenderNode } from '../../../scene';
import { CHART_COLORS } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { createPieSlicePath } from './path';
import type { PieGeometry, PieSliceAngles } from './types';

const START_ANGLE = -Math.PI / 2;
const MAXIMUM_SWEEP = Math.PI * 2 * (359.999 / 360);

interface PieSliceMark {
  seriesId: string;
  color: NonNullable<ChartSeries['color']>;
  angles: PieSliceAngles;
}

export function renderPieSlices(context: ChartRenderContext, geometry: PieGeometry): RenderNode[] {
  return createPieSliceMarks(context.chart.series, geometry.total).map(mark =>
    createSliceNode(context, geometry, mark),
  );
}

function createPieSliceMarks(seriesList: ChartSeries[], total: number): PieSliceMark[] {
  const marks: PieSliceMark[] = [];
  let angle = START_ANGLE;
  seriesList.forEach((series, seriesIndex) => {
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const sweep = (value / total) * Math.PI * 2;
    if (sweep > 0) {
      marks.push({
        seriesId: series.id,
        color: series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length],
        angles: { start: angle, end: angle + Math.min(sweep, MAXIMUM_SWEEP) },
      });
      angle += sweep;
    }
  });
  return marks;
}

function createSliceNode(context: ChartRenderContext, geometry: PieGeometry, mark: PieSliceMark): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-pie-slice-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    bounds,
    d: createPieSlicePath(geometry, mark.angles),
    style: { fill: paint(mark.color, diagnostics, chart.id) },
  };
}
