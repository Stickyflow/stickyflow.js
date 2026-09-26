import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { CHART_COLORS, gapInsetAngle, maxPieCornerRadius, pieUsesInnerArc } from '../../primitives';
import { seriesValueProp } from '../../propPath';
import type { ChartRenderContext } from '../types';
import { renderPieLabels } from './labels';
import { createPieSlicePath } from './path';
import type { PieGeometry, PieSliceAngles } from './types';

const START_ANGLE = -Math.PI / 2;
const MAXIMUM_SWEEP = Math.PI * 2 * (359.999 / 360);

interface PieSliceMark {
  seriesId: string;
  label: string;
  color: NonNullable<ChartSeries['color']>;
  stroke?: string;
  strokeWidth?: number;
  value: number;
  share: number;
  angles: PieSliceAngles;
  labelPulled: boolean;
}

export function renderPieSlices(context: ChartRenderContext, geometry: PieGeometry): RenderNode[] {
  const marks = createPieSliceMarks(context.chart.series, geometry.total);
  const gapPx = context.chart.config?.pieSliceGap ?? 0;
  return [
    ...marks.map(mark => createSliceNode(context, geometry, mark, gapPx)),
    ...renderPieLabels(
      context,
      geometry,
      marks.map(mark => ({
        seriesId: mark.seriesId,
        label: mark.label,
        color: mark.color,
        share: mark.share,
        start: mark.angles.start,
        end: mark.angles.end,
        labelPulled: mark.labelPulled,
      })),
    ),
  ];
}

function createPieSliceMarks(seriesList: ChartSeries[], total: number): PieSliceMark[] {
  const marks: PieSliceMark[] = [];
  let angle = START_ANGLE;
  seriesList.forEach((series, seriesIndex) => {
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const sweep = (value / total) * Math.PI * 2;
    marks.push({
      seriesId: series.id,
      label: series.label,
      color: series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length],
      stroke: series.stroke,
      strokeWidth: series.stroke_width,
      value,
      share: value / total,
      angles: { start: angle, end: angle + Math.min(sweep, MAXIMUM_SWEEP) },
      labelPulled: series.labelPulled === true,
    });
    angle += sweep;
  });
  return marks;
}

function createSliceNode(
  context: ChartRenderContext,
  geometry: PieGeometry,
  mark: PieSliceMark,
  gapPx: number,
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const fill = paint(mark.color, diagnostics, chart.id);
  const halfGap = Math.max(0, gapPx) / 2;
  const innerBoundaryRadius = pieUsesInnerArc(geometry, mark.angles, gapPx) ? geometry.innerRadius : 0;
  const rawSweep = mark.angles.end - mark.angles.start;
  const gapSweep = 2 * gapInsetAngle(halfGap, geometry.outerRadius);
  const availableSweep = Math.max(0, rawSweep - gapSweep);
  const cornerRadius = Math.min(
    geometry.cornerRadius,
    maxPieCornerRadius(geometry.outerRadius, innerBoundaryRadius, availableSweep),
  );
  return {
    type: 'path',
    id: `chart-pie-slice-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    bounds,
    d: createPieSlicePath(geometry, mark.angles, cornerRadius, gapPx),
    detail: {
      of: 'chartValue',
      series: mark.seriesId,
      valueIndex: 0,
      mark: 'pie-slice',
      pieStart: mark.angles.start,
      pieEnd: mark.angles.end,
      pieValue: mark.value,
    },
    prop: seriesValueProp(mark.seriesId, 0),
    style: mark.stroke
      ? { fill, stroke: { kind: 'solid', color: mark.stroke }, strokeWidth: finite(mark.strokeWidth, 1) }
      : { fill },
  };
}
