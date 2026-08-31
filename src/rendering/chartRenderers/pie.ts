import { finite, paint } from '../renderPrimitives';
import { CHART_COLORS } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderPie(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const total = chart.series.reduce((sum, series) => sum + Math.max(0, finite((series.values as number[])[0], 0)), 0) || 1;
  const cx = plot.x + plot.width / 2, cy = plot.y + plot.height / 2;
  const outerRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
  const innerRadius = Math.max(0, Math.min(chart.config?.innerRadius ?? 0, outerRadius - 1));
  const arcPoint = (angle: number, r: number) => ({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  let angle = -Math.PI / 2;
  chart.series.forEach((series, seriesIndex) => {
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const sweep = value / total * Math.PI * 2;
    if (sweep <= 0) return;
    const endAngle = angle + Math.min(sweep, Math.PI * 2 * (359.999 / 360));
    const largeArc = endAngle - angle > Math.PI ? 1 : 0;
    const outerStart = arcPoint(angle, outerRadius), outerEnd = arcPoint(endAngle, outerRadius);
    const d = innerRadius > 0
      ? (() => {
        const innerEnd = arcPoint(endAngle, innerRadius), innerStart = arcPoint(angle, innerRadius);
        return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
      })()
      : `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
    nodes.push({ type: 'path', id: `chart-pie-slice-${chart.id}-${series.id}`, order: nextOrder(), bounds, d, style: { fill: paint(color, diagnostics, chart.id) } });
    angle += sweep;
  });
  return nodes;
}

