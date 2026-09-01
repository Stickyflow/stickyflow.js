import { chartText } from '../../chartPrimitives';
import { finite } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { MekkoLayout } from './types';

const PERCENT_TICKS = [0, 25, 50, 75, 100];

export function renderMekkoGrid(context: ChartRenderContext, layout: MekkoLayout): RenderNode[] {
  const nodes: RenderNode[] = [];
  if (context.chart.show_grid !== false) {
    nodes.push(...renderGridLines(context, layout));
  }
  if (context.showLabels) {
    nodes.push(...renderPercentageLabels(context, layout));
  }
  return nodes;
}

function renderGridLines(context: ChartRenderContext, layout: MekkoLayout): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  return PERCENT_TICKS.map(percent => {
    const y = percentageY(layout, percent);
    return {
      type: 'path',
      id: `chart-mekko-grid-${chart.id}-${percent}`,
      order: nextOrder(),
      bounds,
      d: `M ${layout.grid.x} ${y} L ${layout.grid.x + layout.grid.width} ${y}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
        strokeWidth: finite(chart.grid_width, 1),
      },
    };
  });
}

function renderPercentageLabels(context: ChartRenderContext, layout: MekkoLayout): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  return PERCENT_TICKS.map(percent => ({
    ...chartText(
      `chart-mekko-pct-${chart.id}-${percent}`,
      nextOrder(),
      bounds,
      plot.x,
      percentageY(layout, percent) - layout.smallFontSize / 2,
      layout.labelGutterWidth - 6,
      layout.smallFontSize + 2,
      `${percent}%`,
      chart,
      'right',
    ),
    fontSize: layout.smallFontSize,
  }));
}

function percentageY(layout: MekkoLayout, percent: number): number {
  return layout.grid.y + layout.grid.height * (1 - percent / 100);
}
