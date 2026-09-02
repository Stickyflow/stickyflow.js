import { layoutSankey, type SankeyLinkInput, type SankeyNodeInput } from '../../../../model/geometry/sankey';
import { finite } from '../../../renderPrimitives';
import { DEFAULT_ZONE_FILL, representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { SankeyRenderData } from './types';

export function createSankeyRenderData(context: ChartRenderContext): SankeyRenderData {
  const { chart, plot, showLabels } = context;
  const labelGutter = showLabels ? 92 : 0;
  const availableWidth = Math.max(1, plot.width - labelGutter * 2);
  const layout = layoutSankey(createNodeInputs(context), createLinkInputs(context), availableWidth, plot.height);
  return {
    ...layout,
    baseX: plot.x + labelGutter,
    baseY: plot.y,
    labelGutter,
    fontSize: Math.max(9, finite(chart.font_size, 12)),
    columnCount: Math.max(1, ...layout.nodes.map(node => node.column + 1)),
    nodeColors: new Map(layout.nodes.map(node => [node.id, node.color || DEFAULT_ZONE_FILL])),
  };
}

function createNodeInputs(context: ChartRenderContext): SankeyNodeInput[] {
  return (context.chart.config?.zones ?? []).map(zone => ({
    id: zone.label,
    label: zone.label,
    color: zone.color,
  }));
}

function createLinkInputs(context: ChartRenderContext): SankeyLinkInput[] {
  const inputs: SankeyLinkInput[] = [];
  context.chart.series.forEach(series => {
    if (!series.source || !series.target) {
      return;
    }
    inputs.push({
      source: series.source,
      target: series.target,
      value: (series.values as number[])[0] ?? 0,
      color: series.color ? representativeColor(series.color, DEFAULT_ZONE_FILL) : undefined,
    });
  });
  return inputs;
}
