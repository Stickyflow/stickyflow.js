import { CHART_COLORS, mapChartValue } from '../chartPrimitives';
import { finite, paint } from '../renderPrimitives';
import type { RenderNode, SceneStyle } from '../scene';
import type { ChartRenderContext } from './types';

export function renderCustom(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  chart.series.forEach((series, seriesIndex) => {
    const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
    const pairs = explicit
      ? (series.values as number[][]).map(v => [v[0], v[1]] as [number, number])
      : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    pairs.forEach(([vx, vy], i) => {
      const x = plot.x + mapChartValue(vx, chart.axis_x, plot.width),
        y = plot.y + plot.height - mapChartValue(vy, chart.axis_y, plot.height);
      const style: SceneStyle = {
        fill: paint(color, diagnostics, chart.id),
        stroke: series.stroke ? { kind: 'solid', color: series.stroke } : undefined,
        strokeWidth: series.stroke ? finite(series.stroke_width, 1) : undefined,
      };
      if (series.symbol?.points.length) {
        const d = `${series.symbol.points.map(([dx, dy], pi) => `${pi === 0 ? 'M' : 'L'} ${x + dx} ${y + dy}`).join(' ')} Z`;
        nodes.push({
          type: 'path',
          id: `chart-custom-mark-${chart.id}-${series.id}-${i}`,
          order: nextOrder(),
          bounds,
          d,
          style,
        });
      } else {
        nodes.push({
          type: 'ellipse',
          id: `chart-custom-mark-${chart.id}-${series.id}-${i}`,
          order: nextOrder(),
          bounds,
          cx: x,
          cy: y,
          rx: 3,
          ry: 3,
          style,
        });
      }
    });
  });
  return nodes;
}
