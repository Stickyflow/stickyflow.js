import type { ChartSeries } from '../../../model/charts';
import { wrapText } from '../../../model/geometry/text';
import { squarifyTreemap } from '../../../model/geometry/treemap';
import { chartText, contrastTextColor, representativeColor } from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import { treemapLeafColor, treemapLeafValue } from './layout';
import type { TreemapLayout } from './types';

interface TreemapTile {
  x: number;
  y: number;
  width: number;
  height: number;
  item: { leaf: ChartSeries; value: number };
}

export function renderTreemapTiles(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  const items = layout.leaves.map(leaf => ({ leaf, value: treemapLeafValue(leaf) }));
  const tiles = squarifyTreemap(items, 0, 0, layout.gridWidth, layout.gridHeight);
  const nodes: RenderNode[] = [];
  tiles.forEach(tile => {
    nodes.push(...renderTile(context, layout, tile));
  });
  return nodes;
}

function renderTile(context: ChartRenderContext, layout: TreemapLayout, tile: TreemapTile): RenderNode[] {
  const color = treemapLeafColor(tile.item.leaf, layout);
  const nodes = [createTileNode(context, tile, color)];
  if (context.showLabels && tile.width >= 34 && tile.height >= 18) {
    nodes.push(createTileLabel(context, layout, tile, color));
  }
  return nodes;
}

function createTileNode(
  context: ChartRenderContext,
  tile: TreemapTile,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-treemap-tile-${chart.id}-${tile.item.leaf.id}`,
    order: nextOrder(),
    bounds,
    x: plot.x + tile.x,
    y: plot.y + tile.y,
    width: tile.width,
    height: tile.height,
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: '#ffffff' },
      strokeWidth: 1,
    },
  };
}

function createTileLabel(
  context: ChartRenderContext,
  layout: TreemapLayout,
  tile: TreemapTile,
  color: Parameters<typeof representativeColor>[0],
): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  const { leaf, value } = tile.item;
  const width = Math.max(1, tile.width - 8);
  return {
    ...chartText(
      `chart-treemap-label-${chart.id}-${leaf.id}`,
      nextOrder(),
      bounds,
      plot.x + tile.x + 4,
      plot.y + tile.y + 3,
      width,
      Math.max(1, tile.height - 6),
      `${leaf.label} ${value}`,
      chart,
    ),
    lines: wrapText(`${leaf.label}\n${value}`, width, layout.smallFontSize),
    fontSize: layout.smallFontSize,
    color: contrastTextColor(representativeColor(color, '#ffffff')),
  };
}
