import type { ChartSeries } from '../../../../model/chart';
import type { Bounds, RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { ellipsizeToWidth, wrapText } from '../../../scene/textLayout';
import {
  barPath,
  barShapePath,
  CHART_COLORS,
  chartText,
  contrastTextColor,
  representativeColor,
  resolveChartShadow,
} from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { MekkoLayout } from './types';

const BACKDROP_OPACITY = 0.15;

interface MekkoSegment {
  columnIndex: number;
  seriesId: string;
  seriesLabel: string;
  value: number;
  color: NonNullable<ChartSeries['color']>;
  isTop: boolean;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function renderMekkoColumnSegments(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
): RenderNode[] {
  const showBackdrop = context.chart.config?.showColumnBackdrop !== false;
  const backdrop = showBackdrop ? [createColumnBackdrop(context, layout, columnIndex)] : [];
  const gradientFlow = Boolean(context.chart.config?.tileGradient);
  const columnSegments = calculateColumnSegments(context.chart.series, layout, columnIndex);
  const segments = columnSegments.flatMap((segment, index) =>
    renderSegment(context, layout, segment, gradientFlow ? columnSegments[index + 1]?.color : undefined),
  );
  return [...backdrop, ...segments];
}

function createColumnBackdrop(context: ChartRenderContext, layout: MekkoLayout, columnIndex: number): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const column = layout.columns[columnIndex];
  const cornerRadius = mekkoCornerRadius(context);
  return {
    type: 'path',
    id: `chart-mekko-column-backdrop-${chart.id}-${columnIndex}`,
    order: nextOrder(),
    bounds,
    d: barShapePath(column.x, layout.grid.y, column.width, layout.grid.height, cornerRadius),
    style: { fill: paint(chart.gridColor ?? '#e2e8f0', diagnostics, chart.id), opacity: BACKDROP_OPACITY },
  };
}

function mekkoCornerRadius(context: ChartRenderContext): number {
  return Math.max(0, finite(context.chart.config?.barCornerRadius, 2));
}

function calculateColumnSegments(seriesList: ChartSeries[], layout: MekkoLayout, columnIndex: number): MekkoSegment[] {
  const segments: MekkoSegment[] = [];
  const column = layout.columns[columnIndex];
  let cumulativeHeight = 0;

  seriesList.forEach((series, seriesIndex) => {
    const value = (series.values as number[])[columnIndex] ?? 0;
    const height = (column.total > 0 ? value / column.total : 0) * column.height;
    const y = column.y + cumulativeHeight;
    cumulativeHeight += height;
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    segments.push({
      columnIndex,
      seriesId: series.id,
      seriesLabel: series.label,
      value,
      color,
      isTop: seriesIndex === 0,
      frame: {
        x: column.x,
        y,
        width: column.width,
        height,
      },
    });
  });

  return segments;
}

function renderSegment(
  context: ChartRenderContext,
  layout: MekkoLayout,
  segment: MekkoSegment,
  nextColor: NonNullable<ChartSeries['color']> | undefined,
): RenderNode[] {
  return [createSegmentNode(context, segment, nextColor), ...createSegmentLabel(context, layout, segment)];
}

function createSegmentNode(
  context: ChartRenderContext,
  segment: MekkoSegment,
  nextColor: NonNullable<ChartSeries['color']> | undefined,
): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const shadow = resolveChartShadow(chart.shadowStyle);
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;
  const config = chart.config;
  const radius = segment.isTop || config?.mekkoRoundAll ? mekkoCornerRadius(context) : 0;
  const { x, y, width, height } = segment.frame;
  const segmentGap = Math.max(0, finite(config?.mekkoSegmentGap, 0));
  const fallback = '#94a3b8';
  const gradientBounds: Bounds = {
    minX: x + width / 2 - height / 2,
    maxX: x + width / 2 + height / 2,
    minY: y,
    maxY: y + height,
  };
  const fill = nextColor
    ? {
        kind: 'linear-gradient' as const,
        angle: 90,
        stops: [
          { offset: 0, color: representativeColor(segment.color, fallback) },
          { offset: 100, color: representativeColor(nextColor, fallback) },
        ],
      }
    : paint(segment.color, diagnostics, chart.id);
  return {
    type: 'path',
    id: `chart-mekko-seg-${chart.id}-${segment.columnIndex}-${segment.seriesId}`,
    order: nextOrder(),
    bounds: nextColor ? gradientBounds : bounds,
    d: barPath(x, y + segmentGap / 2, width, Math.max(0, height - segmentGap), radius, Boolean(config?.mekkoRoundAll)),
    style: {
      fill,
      stroke: { kind: 'solid', color: config?.mekkoSegmentStrokeColor ?? chart.gridColor ?? '#e2e8f0' },
      strokeWidth: finite(config?.mekkoSegmentStrokeWidth, finite(chart.gridWidth, 1)),
      shadow,
      clip: clipPath ? { type: 'path', d: clipPath } : undefined,
    },
  };
}

function createSegmentLabel(context: ChartRenderContext, layout: MekkoLayout, segment: MekkoSegment): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const { x, y, width, height } = segment.frame;
  if (!context.showLegend || width < 34) {
    return [];
  }
  const innerWidth = Math.max(1, width - 8);
  const innerHeight = Math.max(1, height - 6);
  const lineHeight = layout.labelSize * 1.2;
  const valueHeight = layout.valueSize * 1.2;
  const labelLines = wrapText(segment.seriesLabel, innerWidth, layout.labelSize).map(line =>
    ellipsizeToWidth(line, innerWidth, layout.labelSize, true),
  );
  if (labelLines.length * lineHeight + valueHeight > innerHeight) {
    return [];
  }
  const textColor = chart.config?.mekkoTextColor ?? contrastTextColor(representativeColor(segment.color, '#ffffff'));
  const columnTotal = layout.columns[segment.columnIndex]?.total ?? 0;
  const valueText =
    chart.config?.mekkoValueFormat === 'percent'
      ? `${columnTotal > 0 ? Math.round((segment.value / columnTotal) * 100) : 0}%`
      : String(segment.value);

  const label: RenderNode = {
    ...chartText({
      id: `chart-mekko-seg-label-${chart.id}-${segment.columnIndex}-${segment.seriesId}`,
      order: nextOrder(),
      bounds,
      frame: { x: x + 4, y: y + 3, width: innerWidth, height: innerHeight },
      text: segment.seriesLabel,
      chart,
    }),
    lines: labelLines,
    fontSize: layout.labelSize,
    fontWeight: 'bold',
    color: textColor,
  };

  const valueNode: RenderNode = {
    ...chartText({
      id: `chart-mekko-seg-value-${chart.id}-${segment.columnIndex}-${segment.seriesId}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: x + 4,
        y: y + 3 + labelLines.length * lineHeight,
        width: innerWidth,
        height: Math.max(1, innerHeight - labelLines.length * lineHeight),
      },
      text: valueText,
      chart,
    }),
    lines: [valueText],
    fontSize: layout.valueSize,
    color: textColor,
  };

  return [label, valueNode];
}
