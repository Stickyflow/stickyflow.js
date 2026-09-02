import { computeHexBins } from '../../model/geometry/hexbin';
import { CHART_COLORS, DEFAULT_HEX_RADIUS, mapChartValue } from '../chartPrimitives';
import { paint } from '../renderPrimitives';
import type { RenderNode } from '../scene';
import type { ChartRenderContext } from './types';

export function renderHexbin(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const hexRadius = Math.max(1, chart.config?.hexRadius ?? DEFAULT_HEX_RADIUS);
  const hexPath = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = ((-60 + 60 * i) * Math.PI) / 180;
      pts.push(`${i === 0 ? 'M' : 'L'} ${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
    }
    return `${pts.join(' ')} Z`;
  };
  chart.series.forEach((series, seriesIndex) => {
    const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
    const pairs = explicit
      ? (series.values as [number, number][])
      : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
    const pixelPoints = pairs.map(([vx, vy]) => ({
      x: plot.x + mapChartValue(vx, chart.axis_x, plot.width),
      y: plot.y + plot.height - mapChartValue(vy, chart.axis_y, plot.height),
    }));
    const bins = computeHexBins(pixelPoints, hexRadius);
    const maxCount = Math.max(1, ...bins.map(bin => bin.count));
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    bins.forEach((bin, i) => {
      nodes.push({
        type: 'path',
        id: `chart-hexbin-${chart.id}-${series.id}-${i}`,
        order: nextOrder(),
        bounds,
        d: hexPath(bin.cx, bin.cy, hexRadius),
        style: { fill: paint(color, diagnostics, chart.id), opacity: Math.max(0.15, bin.count / maxCount) },
      });
    });
  });
  return nodes;
}
