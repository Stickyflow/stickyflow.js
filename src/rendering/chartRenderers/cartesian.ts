import { paint } from '../renderPrimitives';
import { CHART_COLORS, errorBarRange, errorWhiskerNode, mapChartValue, representativeColor } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderCartesian(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  chart.series.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
    const pairs = explicit ? series.values as [number, number][] : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
    if (chart.chart_type === 'bar') {
      const count = Math.max(1, ...chart.series.map(item => item.values.length)), slot = plot.width / count, barWidth = Math.max(1, (slot - 8) / Math.max(1, chart.series.length));
      series.values.forEach((value, i) => {
        const yValue = Array.isArray(value) ? value[1] : value;
        const height = Math.max(0, mapChartValue(yValue, chart.axis_y, plot.height));
        const x = plot.x + i * slot + 4 + seriesIndex * barWidth, width = Math.max(1, barWidth - 2);
        nodes.push({ type: 'rect', id: `chart-bar-${chart.id}-${series.id}-${i}`, order: nextOrder(), bounds, x, y: plot.y + plot.height - height, width, height, rx: 2, sfSeries: series.id, sfValueIndex: i, style: { fill: paint(color, diagnostics, chart.id) } });
        const err = series.error?.[i];
        if (err != null) {
          const [lo, hi] = errorBarRange(yValue, err);
          nodes.push(errorWhiskerNode(`chart-bar-error-${chart.id}-${series.id}-${i}`, nextOrder(), bounds, x + width / 2,
            plot.y + plot.height - mapChartValue(lo, chart.axis_y, plot.height), plot.y + plot.height - mapChartValue(hi, chart.axis_y, plot.height), chart.text_color ?? '#0f172a', series.id, i));
        }
      });
    } else {
      const pixels = pairs.map(([x, y]) => ({ x: plot.x + mapChartValue(x, chart.axis_x, plot.width), y: plot.y + plot.height - mapChartValue(y, chart.axis_y, plot.height) }));
      if (chart.chart_type === 'line' && pixels.length) nodes.push({ type: 'path', id: `chart-line-${chart.id}-${series.id}`, order: nextOrder(), bounds, d: `M ${pixels.map((point, i) => `${i ? 'L' : ''} ${point.x} ${point.y}`).join(' ')}`, style: { fill: { kind: 'none' }, stroke: paint(color, diagnostics, chart.id), strokeWidth: 2, lineJoin: 'round' } });
      pixels.forEach((point, i) => {
        const err = chart.chart_type === 'line' ? series.error?.[i] : undefined;
        if (err != null) {
          const [lo, hi] = errorBarRange(pairs[i][1], err);
          nodes.push(errorWhiskerNode(`chart-line-error-${chart.id}-${series.id}-${i}`, nextOrder(), bounds, point.x,
            plot.y + plot.height - mapChartValue(lo, chart.axis_y, plot.height), plot.y + plot.height - mapChartValue(hi, chart.axis_y, plot.height), representativeColor(color, '#0f172a'), series.id, i));
        }
        nodes.push({ type: 'ellipse', id: `chart-point-${chart.id}-${series.id}-${i}`, order: nextOrder(), bounds, cx: point.x, cy: point.y, rx: chart.chart_type === 'scatter' ? 4 : 3, ry: chart.chart_type === 'scatter' ? 4 : 3, sfSeries: series.id, sfValueIndex: i, style: { fill: paint(color, diagnostics, chart.id) } });
      });
    }
  });
  return nodes;
}

