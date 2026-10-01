import type { ChartSeries } from '../../../../model/charts';
import { wrapText } from '../../../../model/geometry/text';
import type { Bounds, RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import {
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
    style: { fill: paint(chart.grid_color ?? '#e2e8f0', diagnostics, chart.id), opacity: BACKDROP_OPACITY },
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
  const shadow = resolveChartShadow(chart.shadow_style);
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;
  const radius = segment.isTop ? mekkoCornerRadius(context) : 0;
  const { x, y, width, height } = segment.frame;
  const fallback = '#94a3b8';
  // Forced-square bounds (side = height) so the angle:90 gradient spans exactly this segment, not the shared chart-wide bounds.
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
    d: barShapePath(x, y, width, height, radius),
    style: {
      fill,
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: finite(chart.grid_width, 1),
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
  const lineHeight = layout.smallFontSize * 1.2;
  const labelLines = wrapText(segment.seriesLabel, innerWidth, layout.smallFontSize);
  // Checked against the real wrapped line count, not a fixed height guess, so long labels can't overflow.
  if ((labelLines.length + 1) * lineHeight > innerHeight) {
    return [];
  }
  const textColor = contrastTextColor(representativeColor(segment.color, '#ffffff'));

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
    fontSize: layout.smallFontSize,
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
      text: String(segment.value),
      chart,
    }),
    lines: [String(segment.value)],
    fontSize: layout.smallFontSize,
    color: textColor,
  };

  return [label, valueNode];
}
