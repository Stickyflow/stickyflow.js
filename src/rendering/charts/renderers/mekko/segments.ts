import type { ChartSeries } from '../../../../model/charts';
import { wrapText } from '../../../../model/geometry/text';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { CHART_COLORS, chartText, contrastTextColor, representativeColor, resolveChartShadow } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { MekkoLayout } from './types';

interface MekkoSegment {
  columnIndex: number;
  seriesId: string;
  seriesLabel: string;
  value: number;
  color: NonNullable<ChartSeries['color']>;
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
  return calculateColumnSegments(context.chart.series, layout, columnIndex).flatMap(segment =>
    renderSegment(context, layout, segment),
  );
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

function renderSegment(context: ChartRenderContext, layout: MekkoLayout, segment: MekkoSegment): RenderNode[] {
  const nodes = [createSegmentNode(context, segment)];
  if (shouldRenderSegmentLabel(context, segment)) {
    nodes.push(createSegmentLabel(context, layout, segment));
  }
  return nodes;
}

function shouldRenderSegmentLabel(context: ChartRenderContext, segment: MekkoSegment): boolean {
  return context.showLegend && segment.frame.height >= 16 && segment.frame.width >= 34;
}

function createSegmentNode(context: ChartRenderContext, segment: MekkoSegment): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const shadow = resolveChartShadow(chart.shadow_style);
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;
  return {
    type: 'rect',
    id: `chart-mekko-seg-${chart.id}-${segment.columnIndex}-${segment.seriesId}`,
    order: nextOrder(),
    bounds,
    ...segment.frame,
    style: {
      fill: paint(segment.color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: finite(chart.grid_width, 1),
      shadow,
      clip: clipPath ? { type: 'path', d: clipPath } : undefined,
    },
  };
}

function createSegmentLabel(context: ChartRenderContext, layout: MekkoLayout, segment: MekkoSegment): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const { x, y, width, height } = segment.frame;
  const text = `${segment.seriesLabel} ${segment.value}`;
  return {
    ...chartText({
      id: `chart-mekko-seg-label-${chart.id}-${segment.columnIndex}-${segment.seriesId}`,
      order: nextOrder(),
      bounds,
      frame: { x: x + 4, y: y + 3, width: Math.max(1, width - 8), height: Math.max(1, height - 6) },
      text,
      chart,
    }),
    lines: wrapText(`${segment.seriesLabel}\n${segment.value}`, Math.max(1, width - 8), layout.smallFontSize),
    fontSize: layout.smallFontSize,
    color: contrastTextColor(representativeColor(segment.color, '#ffffff')),
  };
}
