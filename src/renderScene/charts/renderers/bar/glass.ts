import type { RenderNode } from '../../../scene';
import { finite } from '../../../scene';
import { chartImageRect } from '../../chartBackdrop';
import { buildChartGrid } from '../../decorations/grid';
import type { ChartRenderContext } from '../types';

export function createGlassBackdropNodes(context: ChartRenderContext, id: string, d: string): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const blur = finite(chart.config?.barGlassBlur, 0);
  if (blur <= 0 || !chart.fillImage) {
    return [];
  }
  const rect = chartImageRect(chart);
  const nodes: RenderNode[] = [
    {
      type: 'image',
      id: `chart-bar-glass-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      href: chart.fillImage.url,
      style: {
        blur,
        saturate: finite(chart.config?.barGlassSaturation, 1),
        clip: { type: 'path', d },
        pointerEvents: 'none',
      },
    },
  ];
  if (chart.fillImage.overlay) {
    nodes.push({
      type: 'path',
      id: `chart-bar-glass-overlay-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      d,
      style: { fill: { kind: 'solid', color: chart.fillImage.overlay }, pointerEvents: 'none' },
    });
  }
  if (chart.config?.barGlassTint) {
    nodes.push({
      type: 'path',
      id: `chart-bar-glass-tint-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      d,
      style: { fill: { kind: 'solid', color: chart.config.barGlassTint }, pointerEvents: 'none' },
    });
  }
  nodes.push(
    ...buildChartGrid(chart, context.plot, bounds, 0).map(node => ({
      ...node,
      id: `${node.id}-glass-${id}`,
      order: nextOrder(),
      style: {
        ...('style' in node ? node.style : {}),
        clip: { type: 'path' as const, d },
        pointerEvents: 'none' as const,
      },
    })),
  );
  return nodes;
}
