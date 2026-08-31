import { CHART_COLORS, stackedSegment } from '../chartPrimitives';
import { paint } from '../renderPrimitives';
import type { RenderNode } from '../renderScene';
import { renderCartesian } from './cartesian';
import type { ChartRenderContext, StackedMode } from './types';

export function renderBar(context: ChartRenderContext, stackedMode?: StackedMode): RenderNode[] {
  if (!stackedMode) return renderCartesian(context);
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const count = Math.max(1, ...chart.series.map(item => item.values.length)),
    slot = plot.width / count,
    barWidth = Math.max(1, slot - 8);
  for (let i = 0; i < count; i++) {
    chart.series.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const seg = stackedSegment(chart, stackedMode, i, seriesIndex, plot.height);
      const y = plot.y + plot.height - Math.max(seg.pixelStart, seg.pixelEnd);
      const height = Math.max(1, Math.abs(seg.pixelEnd - seg.pixelStart));
      const x = plot.x + i * slot + 4;
      nodes.push({
        type: 'rect',
        id: `chart-bar-${chart.id}-${series.id}-${i}`,
        order: nextOrder(),
        bounds,
        x,
        y,
        width: barWidth,
        height,
        rx: 2,
        sfSeries: series.id,
        sfValueIndex: i,
        style: { fill: paint(color, diagnostics, chart.id) },
      });
    });
  }
  return nodes;
}
