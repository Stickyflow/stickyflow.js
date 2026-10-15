import type { Chart } from '../../model/chart';
import type { Bounds, RenderNode } from '../scene';
import { finite } from '../scene';
import type { ChartRenderOrder } from './chartRenderOrder';

export function chartImageRect(chart: Chart): { x: number; y: number; width: number; height: number; rx: number } {
  const inset = finite(chart.strokeWidth, 1) / 2;
  return {
    x: chart.x + inset,
    y: chart.y + inset,
    width: Math.max(1, chart.width - inset * 2),
    height: Math.max(1, chart.height - inset * 2),
    rx: Math.max(0, finite(chart.cornerRadius, 12) - inset),
  };
}

export function buildChartBackdrop(chart: Chart, bounds: Bounds, order: ChartRenderOrder): RenderNode[] {
  if (!chart.fillImage) {
    return [];
  }
  const rect = chartImageRect(chart);
  const nodes: RenderNode[] = [
    {
      type: 'image',
      id: `chart-image-${chart.id}`,
      order: order.next(),
      bounds,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      href: chart.fillImage.url,
      style: { clip: { type: 'rect', ...rect }, pointerEvents: 'none' },
    },
  ];
  if (chart.fillImage.overlay) {
    nodes.push({
      type: 'rect',
      id: `chart-image-overlay-${chart.id}`,
      order: order.next(),
      bounds,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rx: rect.rx,
      style: { fill: { kind: 'solid', color: chart.fillImage.overlay }, pointerEvents: 'none' },
    });
  }
  return nodes;
}
