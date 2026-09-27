import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import {
  CHART_COLORS,
  gapInsetAngle,
  maxApexCornerRadius,
  maxPieCornerRadius,
  pieApexRadius,
  pieUsesInnerArc,
  resolveChartShadow,
} from '../../primitives';
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
  labelOffsetX: number;
  labelOffsetY: number;
}

export function renderPieSlices(context: ChartRenderContext, geometry: PieGeometry): RenderNode[] {
  const marks = createPieSliceMarks(context.chart.series, geometry.total);
  const gapPx = context.chart.config?.pieSliceGap ?? 0;
  return [
    ...marks.flatMap(mark => createSliceNodes(context, geometry, mark, gapPx)),
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
        labelOffsetX: mark.labelOffsetX,
        labelOffsetY: mark.labelOffsetY,
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
      labelOffsetX: finite(series.labelOffsetX, 0),
      labelOffsetY: finite(series.labelOffsetY, 0),
    });
    angle += sweep;
  });
  return marks;
}

function fullCirclePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function createSliceNodes(
  context: ChartRenderContext,
  geometry: PieGeometry,
  mark: PieSliceMark,
  gapPx: number,
): RenderNode[] {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const fill = paint(mark.color, diagnostics, chart.id);
  const halfGap = Math.max(0, gapPx) / 2;
  const rawSweep = mark.angles.end - mark.angles.start;
  const usesInnerArc = pieUsesInnerArc(geometry, mark.angles, gapPx);
  const gapSweep = 2 * gapInsetAngle(halfGap, geometry.outerRadius);
  const availableSweep = Math.max(0, rawSweep - gapSweep);
  const cornerRadius = Math.min(
    geometry.cornerRadius,
    usesInnerArc
      ? maxPieCornerRadius(geometry.outerRadius, geometry.innerRadius, availableSweep)
      : maxApexCornerRadius(
          geometry.outerRadius,
          pieApexRadius(halfGap, rawSweep, geometry.outerRadius),
          availableSweep,
        ),
  );
  const slicePath = createPieSlicePath(geometry, mark.angles, cornerRadius, gapPx);
  const shadow = resolveChartShadow(chart.shadow_style);
  const strokeStyle = mark.stroke
    ? { stroke: { kind: 'solid' as const, color: mark.stroke }, strokeWidth: finite(mark.strokeWidth, 1) }
    : {};

  const shadowCaster: RenderNode | undefined = shadow
    ? {
        type: 'path',
        id: `chart-pie-slice-shadow-${chart.id}-${mark.seriesId}`,
        order: nextOrder(),
        bounds,
        d: slicePath,
        style: {
          fill,
          ...strokeStyle,
          shadow,
          clip: { type: 'path', d: fullCirclePath(geometry.centerX, geometry.centerY, geometry.outerRadius) },
        },
      }
    : undefined;

  const slice: RenderNode = {
    type: 'path',
    id: `chart-pie-slice-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    bounds,
    d: slicePath,
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
    style: { fill, ...strokeStyle, innerShadow: shadow },
  };

  return shadowCaster ? [shadowCaster, slice] : [slice];
}
