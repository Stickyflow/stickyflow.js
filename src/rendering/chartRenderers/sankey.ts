import { layoutSankey } from '../../model/geometry/sankey';
import { chartText, DEFAULT_ZONE_FILL, representativeColor } from '../chartPrimitives';
import { finite } from '../renderPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderSankey(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, showLabels, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const sankeyFontSize = Math.max(9, finite(chart.font_size, 12));
  const labelGutter = showLabels ? 92 : 0;
  const nodeInputs = (chart.config?.zones ?? []).map(zone => ({
    id: zone.label,
    label: zone.label,
    color: zone.color,
  }));
  const linkInputs = chart.series
    .filter(series => series.source && series.target)
    .map(series => ({
      source: series.source!,
      target: series.target!,
      value: (series.values as number[])[0] ?? 0,
      color: series.color ? representativeColor(series.color, DEFAULT_ZONE_FILL) : undefined,
    }));
  const availableWidth = Math.max(1, plot.width - labelGutter * 2);
  const originX = labelGutter;
  const { nodes: sankeyNodes, links } = layoutSankey(nodeInputs, linkInputs, availableWidth, plot.height);
  const numColumns = Math.max(1, ...sankeyNodes.map(n => n.column + 1));
  const colorOf = (id: string) => sankeyNodes.find(n => n.id === id)?.color || DEFAULT_ZONE_FILL;
  const baseX = plot.x + originX,
    baseY = plot.y;

  links.forEach((link, linkIndex) => {
    const x0 = baseX + link.x0,
      x1 = baseX + link.x1;
    const y0Top = baseY + link.sourceY0,
      y0Bottom = baseY + link.sourceY1;
    const y1Top = baseY + link.targetY0,
      y1Bottom = baseY + link.targetY1;
    const midX = (x0 + x1) / 2;
    const d = `M ${x0} ${y0Top} C ${midX} ${y0Top} ${midX} ${y1Top} ${x1} ${y1Top} L ${x1} ${y1Bottom} C ${midX} ${y1Bottom} ${midX} ${y0Bottom} ${x0} ${y0Bottom} Z`;
    const color = link.color || colorOf(link.target);
    nodes.push({
      type: 'path',
      id: `chart-sankey-link-${chart.id}-${linkIndex}`,
      order: nextOrder(),
      bounds,
      d,
      style: { fill: { kind: 'solid', color }, opacity: link.color ? 0.85 : 0.45 },
    });
  });
  sankeyNodes.forEach(node => {
    const isLastColumn = node.column === numColumns - 1;
    const x = baseX + node.x,
      y = baseY + node.y;
    nodes.push({
      type: 'rect',
      id: `chart-sankey-node-${chart.id}-${node.id}`,
      order: nextOrder(),
      bounds,
      x,
      y,
      width: node.width,
      height: node.height,
      style: { fill: { kind: 'solid', color: node.color || DEFAULT_ZONE_FILL } },
    });
    if (showLabels) {
      const labelX = isLastColumn ? x - labelGutter + 8 : x + node.width + 6;
      nodes.push({
        ...chartText(
          `chart-sankey-label-${chart.id}-${node.id}`,
          nextOrder(),
          bounds,
          labelX,
          y,
          labelGutter - 12,
          Math.max(1, node.height),
          node.label,
          chart,
          isLastColumn ? 'right' : 'left',
        ),
        fontSize: sankeyFontSize - 2,
        verticalAlign: 'middle',
      });
    }
  });
  return nodes;
}
