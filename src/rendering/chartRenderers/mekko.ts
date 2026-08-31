import { wrapText } from '../../model/geometry/text';
import { finite, paint } from '../renderPrimitives';
import { chartText, CHART_COLORS, contrastTextColor, representativeColor } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderMekko(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const mekkoRows = chart.series;
  const mekkoColumns = chart.config?.categories?.length ? chart.config.categories : ((mekkoRows[0]?.values as number[] | undefined)?.map((_, i) => String(i + 1)) ?? []);
  const mekkoFontSize = Math.max(9, finite(chart.font_size, 12));
  const mekkoSmallFontSize = Math.max(8, mekkoFontSize - 1);
  const varyHeight = chart.config?.mekkoVaryHeight ?? false;
  const COLUMN_GAP = 4;
  const PERCENT_TICKS = [0, 25, 50, 75, 100];
  const leftGutter = showLabels ? 30 : 0, topGutter = showLabels ? 18 : 0, bottomGutter = showLabels ? 32 : 0;
  const mekkoGridX = plot.x + leftGutter, mekkoGridY = plot.y + topGutter;
  const mekkoGridWidth = Math.max(1, plot.width - leftGutter);
  const mekkoGridHeight = Math.max(1, plot.height - topGutter - bottomGutter);
  const columnTotals = mekkoColumns.map((_, colIndex) => mekkoRows.reduce((sum, series) => sum + ((series.values as number[])[colIndex] ?? 0), 0));
  const grandTotal = columnTotals.reduce((sum, total) => sum + total, 0);
  const maxColumnTotal = Math.max(1, ...columnTotals);
  const gapWidth = COLUMN_GAP * Math.max(0, mekkoColumns.length - 1);
  const availableWidth = Math.max(1, mekkoGridWidth - gapWidth);
  const columnWidths = columnTotals.map(total => grandTotal > 0 ? (total / grandTotal) * availableWidth : availableWidth / mekkoColumns.length);
  const columnX = columnWidths.reduce<number[]>((acc, width, i) => { acc.push(i === 0 ? mekkoGridX : acc[i - 1] + columnWidths[i - 1] + COLUMN_GAP); return acc; }, []);
  const columnHeights = columnTotals.map(total => varyHeight ? mekkoGridHeight * (total / maxColumnTotal) : mekkoGridHeight);
  const columnY = columnHeights.map(height => mekkoGridY + (mekkoGridHeight - height));
  
  if (chart.show_grid !== false) PERCENT_TICKS.forEach(p => {
    const y = mekkoGridY + mekkoGridHeight * (1 - p / 100);
    nodes.push({ type: 'path', id: `chart-mekko-grid-${chart.id}-${p}`, order: nextOrder(), bounds, d: `M ${mekkoGridX} ${y} L ${mekkoGridX + mekkoGridWidth} ${y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
  });
  if (showLabels) PERCENT_TICKS.forEach(p => {
    const y = mekkoGridY + mekkoGridHeight * (1 - p / 100);
    nodes.push({ ...chartText(`chart-mekko-pct-${chart.id}-${p}`, nextOrder(), bounds, plot.x, y - mekkoSmallFontSize / 2, leftGutter - 6, mekkoSmallFontSize + 2, `${p}%`, chart, 'right'), fontSize: mekkoSmallFontSize });
  });
  mekkoColumns.forEach((label, colIndex) => {
    const x = columnX[colIndex], width = columnWidths[colIndex], total = columnTotals[colIndex];
    let cumulative = 0;
    mekkoRows.forEach((series, rowIndex) => {
      const value = (series.values as number[])[colIndex] ?? 0;
      const share = total > 0 ? value / total : 0;
      const height = share * columnHeights[colIndex];
      const y = columnY[colIndex] + cumulative;
      cumulative += height;
      const color = series.color ?? CHART_COLORS[rowIndex % CHART_COLORS.length];
      nodes.push({ type: 'rect', id: `chart-mekko-seg-${chart.id}-${colIndex}-${series.id}`, order: nextOrder(), bounds, x, y, width, height, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'solid', color: '#ffffff' }, strokeWidth: 1 } });
      if (showLegend && height >= 16 && width >= 34) {
        nodes.push({
          ...chartText(`chart-mekko-seg-label-${chart.id}-${colIndex}-${series.id}`, nextOrder(), bounds, x + 4, y + 3, Math.max(1, width - 8), Math.max(1, height - 6), `${series.label} ${value}`, chart),
          lines: wrapText(`${series.label}\n${value}`, Math.max(1, width - 8), mekkoSmallFontSize), fontSize: mekkoSmallFontSize, color: contrastTextColor(representativeColor(color, '#ffffff')),
        });
      }
    });
    if (showLabels) {
      nodes.push({ ...chartText(`chart-mekko-total-${chart.id}-${colIndex}`, nextOrder(), bounds, x, plot.y, width, mekkoSmallFontSize + 2, String(total), chart, 'center'), fontSize: mekkoSmallFontSize });
      nodes.push({
        ...chartText(`chart-mekko-col-label-${chart.id}-${colIndex}`, nextOrder(), bounds, x, mekkoGridY + mekkoGridHeight + 4, width, mekkoSmallFontSize * 2 + 4, label, chart, 'center'),
        lines: wrapText(label, width, mekkoSmallFontSize), fontSize: mekkoSmallFontSize,
      });
    }
  });
  return nodes;
}

