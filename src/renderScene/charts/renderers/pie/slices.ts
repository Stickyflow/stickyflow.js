import type { ChartSeries, PieChart } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import type { ResolvedShadow } from '../../primitives';
import {
  CHART_COLORS,
  gapInsetAngle,
  maxApexCornerRadius,
  maxPieCornerRadius,
  pieApexRadius,
  pieUsesInnerArc,
  representativeColor,
  resolveChartShadow,
} from '../../primitives';
import { seriesValueProp } from '../../propPath';
import type { ChartRenderContext } from '../types';
import { renderPieLabels } from './labels';
import { createPieSlicePath } from './path';
import type { PieGeometry, PieSliceAngles } from './types';

const TOP = -Math.PI / 2;
const FULL = Math.PI * 2;
const MAXIMUM_SWEEP = FULL * (359.999 / 360);
const radians = (degrees: number) => (degrees * Math.PI) / 180;

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
  // How far the slice is pushed out along its middle.
  explode: number;
}

export function renderPieSlices(context: ChartRenderContext<PieChart>, geometry: PieGeometry): RenderNode[] {
  const config = context.chart.config;
  const marks = createPieSliceMarks(context.chart.series, geometry.total, {
    start: TOP + radians(finite(config?.pieStartAngle, 0)),
    sweep: Math.min(FULL, Math.max(radians(1), radians(finite(config?.pieSweep, 360)))),
    explode: Math.max(0, finite(config?.pieExplode, 0)),
  });
  const gapPx = config?.pieSliceGap ?? 0;
  return [
    ...marks.flatMap(mark => createSliceNodes(context, shiftGeometry(geometry, mark), mark, gapPx)),
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
        shift: shiftOf(mark),
      })),
    ),
  ];
}

function shiftOf(mark: PieSliceMark): { dx: number; dy: number } {
  const mid = (mark.angles.start + mark.angles.end) / 2;
  return { dx: Math.cos(mid) * mark.explode, dy: Math.sin(mid) * mark.explode };
}

function shiftGeometry(geometry: PieGeometry, mark: PieSliceMark): PieGeometry {
  if (mark.explode === 0) {
    return geometry;
  }
  const { dx, dy } = shiftOf(mark);
  return { ...geometry, centerX: geometry.centerX + dx, centerY: geometry.centerY + dy };
}

function createPieSliceMarks(
  seriesList: ChartSeries[],
  total: number,
  layout: { start: number; sweep: number; explode: number },
): PieSliceMark[] {
  const marks: PieSliceMark[] = [];
  let angle = layout.start;
  seriesList.forEach((series, seriesIndex) => {
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const sweep = (value / total) * layout.sweep;
    marks.push({
      seriesId: series.id,
      label: series.label,
      color: series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length],
      stroke: series.stroke,
      strokeWidth: series.strokeWidth,
      value,
      share: value / total,
      angles: { start: angle, end: angle + Math.min(sweep, layout.sweep >= FULL ? MAXIMUM_SWEEP : layout.sweep) },
      explode: Math.max(0, finite(series.offset, layout.explode)),
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

function pieOuterShadow(shadow: ResolvedShadow, gapPx: number): ResolvedShadow {
  if (gapPx <= 0) {
    return shadow;
  }
  const halfGap = gapPx / 2;
  const blur = Math.min(shadow.blur, halfGap * 2);
  const maxDistance = halfGap;
  const distance = Math.hypot(shadow.dx, shadow.dy);
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  return { ...shadow, blur, dx: shadow.dx * scale, dy: shadow.dy * scale };
}

function createSliceNodes(
  context: ChartRenderContext<PieChart>,
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
  const shadow = resolveChartShadow(chart.shadowStyle);
  const config = chart.config;
  const strokeColor = mark.stroke ?? config?.pieStroke;
  const strokeStyle = strokeColor
    ? {
        stroke: { kind: 'solid' as const, color: strokeColor },
        strokeWidth: finite(mark.strokeWidth, finite(config?.pieStrokeWidth, 1)),
      }
    : {};
  const glow = config?.pieGlow;

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
          shadow: pieOuterShadow(shadow, gapPx),
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
    style: {
      fill,
      ...strokeStyle,
      innerShadow: shadow,
      shadow: glow ? { color: representativeColor(mark.color, '#ffffff'), opacity: 0.85, blur: glow, dx: 0, dy: 0 } : undefined,
    },
  };

  return shadowCaster ? [shadowCaster, slice] : [slice];
}
