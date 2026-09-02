import { wrapText } from '../../../model/geometry/text';
import { CHART_COLORS, chartText, contrastTextColor, representativeColor } from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { MekkoLayout } from './types';

export function renderMekkoColumnSegments(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
): RenderNode[] {
  const nodes: RenderNode[] = [];
  const total = layout.columnTotals[columnIndex];
  let cumulativeHeight = 0;

  context.chart.series.forEach((series, seriesIndex) => {
    const value = (series.values as number[])[columnIndex] ?? 0;
    const height = (total > 0 ? value / total : 0) * layout.columnHeights[columnIndex];
    const y = layout.columnY[columnIndex] + cumulativeHeight;
    cumulativeHeight += height;
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];

    nodes.push(createSegmentNode(context, layout, columnIndex, series.id, y, height, color));
    if (context.showLegend && height >= 16 && layout.columnWidths[columnIndex] >= 34) {
      nodes.push(createSegmentLabel(context, layout, columnIndex, series.id, series.label, value, y, height, color));
    }
  });

  return nodes;
}

function createSegmentNode(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
  seriesId: string,
  y: number,
  height: number,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-mekko-seg-${chart.id}-${columnIndex}-${seriesId}`,
    order: nextOrder(),
    bounds,
    x: layout.columnX[columnIndex],
    y,
    width: layout.columnWidths[columnIndex],
    height,
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: '#ffffff' },
      strokeWidth: 1,
    },
  };
}

function createSegmentLabel(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
  seriesId: string,
  seriesLabel: string,
  value: number,
  y: number,
  height: number,
  color: Parameters<typeof representativeColor>[0],
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const x = layout.columnX[columnIndex];
  const width = layout.columnWidths[columnIndex];
  return {
    ...chartText({
      id: `chart-mekko-seg-label-${chart.id}-${columnIndex}-${seriesId}`,
      order: nextOrder(),
      bounds,
      frame: { x: x + 4, y: y + 3, width: Math.max(1, width - 8), height: Math.max(1, height - 6) },
      text: `${seriesLabel} ${value}`,
      chart,
    }),
    lines: wrapText(`${seriesLabel}\n${value}`, Math.max(1, width - 8), layout.smallFontSize),
    fontSize: layout.smallFontSize,
    color: contrastTextColor(representativeColor(color, '#ffffff')),
  };
}
