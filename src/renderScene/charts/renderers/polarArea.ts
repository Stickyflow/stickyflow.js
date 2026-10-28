import type { ChartSeries, PolarAreaChart } from '../../../model/chart';
import type { RenderNode, SceneText } from '../../scene';
import { DEFAULT_FONT, finite, paint } from '../../scene';
import {
  CHART_COLORS,
  chartTicks,
  clipSegmentToRect,
  contrastTextColor,
  createPieSlicePath,
  formatFieldValue,
  gapInsetAngle,
  maxApexCornerRadius,
  maxPieCornerRadius,
  pieApexRadius,
  pieArcPoint,
  pieUsesInnerArc,
  representativeColor,
  resolveChartShadow,
  sameHueContrastColor,
  sameHueTint,
} from '../primitives';
import { seriesLabelProp, seriesValueProp } from '../propPath';
import type { ChartRenderContext } from './types';

const TOP = -Math.PI / 2;
const TRACK_COLOR_FALLBACK = '#e2e8f0';
const MIN_LABEL_SWEEP = (14 * Math.PI) / 180;
const LABEL_WIDTH = 80;
const LABEL_RADIUS_FRACTION = 0.62;
const OUTSIDE_GAP = 14;
const LEADER_INSET = 3;
const OUTSIDE_TINT_LIGHTNESS = 0.32;
const OUTSIDE_FALLBACK_COLOR = '#334155';

interface WedgeLayout {
  centerX: number;
  centerY: number;
  maxRadius: number;
  innerRadius: number;
  cornerRadius: number;
  gapPx: number;
  axisMin: number;
  range: number;
  sweep: number;
  start: number;
}

type Angles = { start: number; end: number };
type WedgeGeometry = { centerX: number; centerY: number; outerRadius: number; innerRadius: number };
type FillColor = NonNullable<ChartSeries['color']>;

function layoutOf(context: ChartRenderContext<PolarAreaChart>): WedgeLayout {
  const { chart, plot } = context;
  const maxRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
  const axisMin = finite(chart.axisY.min, 0);
  return {
    centerX: plot.x + plot.width / 2,
    centerY: plot.y + plot.height / 2,
    maxRadius,
    innerRadius: Math.max(0, Math.min(finite(chart.config?.innerRadius, 0), maxRadius - 1)),
    cornerRadius: Math.max(0, finite(chart.config?.pieCornerRadius, 0)),
    gapPx: Math.max(0, finite(chart.config?.pieSliceGap, 0)),
    axisMin,
    range: finite(chart.axisY.max, 100) - axisMin,
    sweep: chart.series.length > 0 ? (Math.PI * 2) / chart.series.length : 0,
    start: TOP + (finite(chart.config?.pieStartAngle, 0) * Math.PI) / 180,
  };
}

function clampedCorner(layout: WedgeLayout, outerRadius: number, angles: Angles): number {
  const { centerX, centerY, innerRadius, cornerRadius, gapPx } = layout;
  const geometry = { centerX, centerY, outerRadius, innerRadius };
  const halfGap = Math.max(0, gapPx) / 2;
  const rawSweep = angles.end - angles.start;
  const availableSweep = Math.max(0, rawSweep - 2 * gapInsetAngle(halfGap, outerRadius));
  if (pieUsesInnerArc(geometry, angles, gapPx)) {
    return Math.min(cornerRadius, maxPieCornerRadius(outerRadius, innerRadius, availableSweep));
  }
  const apexRadius = pieApexRadius(halfGap, rawSweep, outerRadius);
  return Math.min(cornerRadius, maxApexCornerRadius(outerRadius, apexRadius, availableSweep));
}

function wedgeNodes(
  context: ChartRenderContext<PolarAreaChart>,
  layout: WedgeLayout,
  series: ChartSeries,
  angles: Angles,
  outerRadius: number,
  value: number,
  rawColor: FillColor,
): RenderNode[] {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const { centerX, centerY, innerRadius, maxRadius, gapPx } = layout;
  const color = paint(rawColor, diagnostics, chart.id);
  const shadow = resolveChartShadow(chart.shadowStyle);
  const trackPath = createPieSlicePath(
    { centerX, centerY, outerRadius: maxRadius, innerRadius },
    angles,
    clampedCorner(layout, maxRadius, angles),
    gapPx,
  );
  const track: RenderNode = {
    type: 'path',
    id: `chart-polar-area-track-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: trackPath,
    style: {
      fill: paint(chart.gridColor ?? TRACK_COLOR_FALLBACK, diagnostics, chart.id),
      opacity: chart.config?.polarTrackOpacity,
      ...trackStroke(context),
    },
  };
  const wedgePath = createPieSlicePath(
    { centerX, centerY, outerRadius, innerRadius },
    angles,
    clampedCorner(layout, outerRadius, angles),
    gapPx,
  );
  const shadowCaster: RenderNode | undefined = shadow
    ? {
        type: 'path',
        id: `chart-polar-area-wedge-shadow-${chart.id}-${series.id}`,
        order: nextOrder(),
        bounds,
        d: wedgePath,
        style: { fill: color, shadow, clip: { type: 'path', d: trackPath } },
      }
    : undefined;
  const wedge: RenderNode = {
    type: 'path',
    id: `chart-polar-area-wedge-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: wedgePath,
    detail: {
      of: 'chartValue',
      series: series.id,
      valueIndex: 0,
      mark: 'polar-area-wedge',
      pieStart: angles.start,
      pieEnd: angles.end,
      pieValue: value,
    },
    prop: seriesValueProp(series.id, 0),
    style: { fill: color, innerShadow: shadow, ...wedgeStroke(context) },
  };
  return shadowCaster ? [track, shadowCaster, wedge] : [track, wedge];
}

function trackStroke(context: ChartRenderContext<PolarAreaChart>) {
  const config = context.chart.config;
  if (!config?.polarTrackStroke) {
    return {};
  }
  const dash = (config.polarTrackDash ?? '')
    .split(/[ ,]+/)
    .map(Number)
    .filter(part => Number.isFinite(part) && part > 0);
  return {
    stroke: { kind: 'solid' as const, color: config.polarTrackStroke },
    strokeWidth: finite(config.polarTrackStrokeWidth, 1),
    dash: dash.length > 0 ? dash : undefined,
  };
}

function wedgeStroke(context: ChartRenderContext<PolarAreaChart>) {
  const config = context.chart.config;
  if (!config?.pieStroke) {
    return {};
  }
  return {
    stroke: { kind: 'solid' as const, color: config.pieStroke },
    strokeWidth: finite(config.pieStrokeWidth, 1),
  };
}

function ringNodes(context: ChartRenderContext<PolarAreaChart>, layout: WedgeLayout): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  if (!chart.config?.polarRings || layout.range <= 0) {
    return [];
  }
  return chartTicks(chart.axisY)
    .filter(tick => tick > layout.axisMin && tick < layout.axisMin + layout.range)
    .map((tick): RenderNode => {
      const radius =
        layout.innerRadius + ((layout.maxRadius - layout.innerRadius) * (tick - layout.axisMin)) / layout.range;
      return {
        type: 'ellipse',
        id: `chart-polar-area-ring-${chart.id}-${tick}`,
        order: nextOrder(),
        bounds,
        cx: layout.centerX,
        cy: layout.centerY,
        rx: radius,
        ry: radius,
        style: {
          fill: { kind: 'none' },
          stroke: { kind: 'solid', color: chart.textColor ?? '#334155' },
          strokeWidth: finite(chart.gridWidth, 1),
          opacity: 0.25,
        },
      };
    });
}

export function renderPolarArea(context: ChartRenderContext<PolarAreaChart>): RenderNode[] {
  const layout = layoutOf(context);
  const { centerX, centerY, innerRadius, maxRadius, axisMin, range, sweep, start } = layout;
  const showLabels = context.showLabels && sweep >= MIN_LABEL_SWEEP;

  const wedges = context.chart.series.flatMap((series, index): RenderNode[] => {
    const angles = { start: start + index * sweep, end: start + (index + 1) * sweep };
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const fraction = range > 0 ? Math.min(1, Math.max(0, (value - axisMin) / range)) : 0;
    const outerRadius = Math.max(innerRadius + 1, innerRadius + (maxRadius - innerRadius) * fraction);
    const rawColor = series.color ?? CHART_COLORS[index % CHART_COLORS.length];
    const nodes = wedgeNodes(context, layout, series, angles, outerRadius, value, rawColor);
    if (!showLabels) {
      return nodes;
    }
    const geometry = { centerX, centerY, outerRadius, innerRadius };
    return [...nodes, ...createWedgeLabel(context, geometry, angles, series, value, rawColor)];
  });
  return [...wedges, ...ringNodes(context, layout)];
}

interface LabelPlacement {
  point: { x: number; y: number };
  color: string;
  outside: boolean;
  mid: number;
  tickStart: { x: number; y: number };
}

function labelSizes(chart: PolarAreaChart): { nameSize: number; valueSize: number } {
  const base = Math.max(9, finite(chart.fontSize, 12));
  return {
    nameSize: Math.max(6, finite(chart.config?.polarNameSize, base)),
    valueSize: Math.max(6, finite(chart.config?.polarValueSize, base)),
  };
}

function labelPlacement(
  context: ChartRenderContext<PolarAreaChart>,
  geometry: WedgeGeometry,
  angles: Angles,
  series: ChartSeries,
  fillColor: FillColor,
): LabelPlacement | undefined {
  const mid = (angles.start + angles.end) / 2;
  const { nameSize, valueSize } = labelSizes(context.chart);
  const lineHeight = ((nameSize + valueSize) * 1.2) / 2;
  const ringThickness = geometry.outerRadius - geometry.innerRadius;
  const labelOffsetX = finite(series.labelOffsetX, 0);
  const labelOffsetY = finite(series.labelOffsetY, 0);
  const hasManualOffset = labelOffsetX !== 0 || labelOffsetY !== 0;
  const tooThin = ringThickness < lineHeight * 2 + 6;
  const chordWidth = 2 * geometry.outerRadius * Math.sin(Math.abs(angles.end - angles.start) / 2);
  const fitsInline = !tooThin && chordWidth >= LABEL_WIDTH;
  const outsideLabels = context.chart.config?.polarOutsideLabels ?? false;
  if (!fitsInline && !hasManualOffset && !outsideLabels) {
    return undefined;
  }
  const outside = hasManualOffset || !fitsInline;
  const tickStart = pieArcPoint(geometry, mid, geometry.outerRadius + LEADER_INSET);
  const point = outside
    ? hasManualOffset
      ? addOffset(pieArcPoint(geometry, mid, geometry.outerRadius), labelOffsetX, labelOffsetY)
      : pieArcPoint(geometry, mid, geometry.outerRadius + OUTSIDE_GAP)
    : pieArcPoint(geometry, mid, geometry.innerRadius + ringThickness * LABEL_RADIUS_FRACTION);
  const color = outside
    ? outsideLabels && context.chart.textColor
      ? context.chart.textColor
      : (sameHueTint(representativeColor(fillColor, OUTSIDE_FALLBACK_COLOR), OUTSIDE_TINT_LIGHTNESS) ??
        OUTSIDE_FALLBACK_COLOR)
    : sameHueContrastColor(
        representativeColor(fillColor, '#0f172a'),
        contrastTextColor(representativeColor(fillColor, '#0f172a')),
      );
  return { point, color, outside, mid, tickStart };
}

type WedgePlacement = NonNullable<ReturnType<typeof labelPlacement>>;

// The short line from the wedge to its label, which is only drawn when the label is pulled out of the wedge.
function labelTick(
  context: ChartRenderContext<PolarAreaChart>,
  series: ChartSeries,
  placement: WedgePlacement,
  lineHeight: number,
): RenderNode {
  const { point, color, outside, tickStart } = placement;
  const tickEnd = outside ? clipSegmentToRect(tickStart, point, LABEL_WIDTH / 2, lineHeight) : tickStart;
  return {
    type: 'path',
    id: `chart-polar-area-label-tick-${context.chart.id}-${series.id}`,
    order: context.nextOrder(),
    bounds: context.bounds,
    d: `M ${tickStart.x} ${tickStart.y} L ${tickEnd.x} ${tickEnd.y}`,
    detail: { of: 'chartSeries', series: series.id, mark: 'polar-area-label-tick' },
    style: outside ? { stroke: { kind: 'solid', color }, strokeWidth: 1.5 } : { stroke: { kind: 'none' } },
  };
}

// The name of the series and its value, one above the other, in the order the chart asks for.
function labelTexts(
  context: ChartRenderContext<PolarAreaChart>,
  geometry: WedgeGeometry,
  series: ChartSeries,
  value: number,
  placement: WedgePlacement,
): SceneText[] {
  const { chart, bounds, nextOrder } = context;
  const { point, color, outside, mid } = placement;
  const { nameSize, valueSize } = labelSizes(chart);
  const detail = {
    of: 'chartSeries' as const,
    series: series.id,
    mark: 'polar-area-label',
    pulled: outside || undefined,
    midAngle: mid,
    wedgeRadius: geometry.outerRadius,
  };
  const base = {
    bounds,
    x: point.x - LABEL_WIDTH / 2,
    width: LABEL_WIDTH,
    fontFamily: chart.fontFamily ?? DEFAULT_FONT,
    align: 'center' as const,
    verticalAlign: 'middle' as const,
    lineHeight: 1.2,
    color,
  };
  const valueFirst = chart.config?.polarValueFirst ?? false;
  const nameHeight = nameSize * 1.2;
  const valueHeight = valueSize * 1.2;
  const top = point.y - (nameHeight + valueHeight) / 2;
  const nameY = valueFirst ? top + valueHeight : top;
  const valueY = valueFirst ? top : top + nameHeight;
  const nameText: SceneText = {
    type: 'text',
    id: `chart-polar-area-label-name-${chart.id}-${series.id}`,
    order: nextOrder(),
    ...base,
    y: nameY,
    height: nameSize * 1.2,
    fontSize: nameSize,
    lines: [series.label],
    fontWeight: valueFirst ? 'normal' : 'bold',
    detail,
    prop: seriesLabelProp(series.id),
  };
  const valueText: SceneText = {
    type: 'text',
    id: `chart-polar-area-label-value-${chart.id}-${series.id}`,
    order: nextOrder(),
    ...base,
    y: valueY,
    height: valueSize * 1.2,
    fontSize: valueSize,
    lines: [formatFieldValue(value)],
    fontWeight: valueFirst ? 'bold' : 'normal',
    detail,
    prop: seriesValueProp(series.id, 0),
    propKind: 'value',
  };
  return [nameText, valueText];
}

function createWedgeLabel(
  context: ChartRenderContext<PolarAreaChart>,
  geometry: WedgeGeometry,
  angles: Angles,
  series: ChartSeries,
  value: number,
  fillColor: FillColor,
): RenderNode[] {
  const placement = labelPlacement(context, geometry, angles, series, fillColor);
  if (!placement) {
    return [];
  }
  const { nameSize, valueSize } = labelSizes(context.chart);
  // The tick takes its order before the texts do.
  const tick = labelTick(context, series, placement, Math.max(nameSize, valueSize) * 1.2);
  return [tick, ...labelTexts(context, geometry, series, value, placement)];
}

function addOffset(point: { x: number; y: number }, dx: number, dy: number): { x: number; y: number } {
  return { x: point.x + dx, y: point.y + dy };
}
