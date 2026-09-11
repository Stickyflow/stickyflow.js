import type { ChartSeries } from '../../../../model/charts';
import { wrapText } from '../../../../model/geometry/text';
import { squarifyTreemap } from '../../../../model/geometry/treemap';
import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { chartText, contrastTextColor, representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { treemapLeafColor, treemapLeafValue } from './layout';
import type { TreemapLayout } from './types';

const HEADER_HEIGHT = 20;

interface TreemapTile {
  x: number;
  y: number;
  width: number;
  height: number;
  item: { leaf: ChartSeries; value: number };
}

interface TreemapHeader {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
}

export function renderTreemapTiles(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  const { tiles, headers } = layoutTreemapTiles(context, layout);
  const nodes: RenderNode[] = [];
  tiles.forEach(tile => {
    nodes.push(...renderTile(context, layout, tile));
  });
  headers.forEach((header, index) => {
    nodes.push(...renderTreemapHeader(context, header, index));
  });
  return nodes;
}

// A leaf's `group` assigns it to a top-level branch (e.g. "Fruits") : with
// no leaf grouped, this is a plain single-level squarify, same as before
// group existed. With any leaf grouped, it's two squarify passes - branch
// rectangles sized by their leaves' value SUM, then each branch's own
// leaves squarified again inside a header band's worth less height - so a
// branch with many small leaves still reads as one visual region instead
// of leaves from different branches interleaving by size.
function layoutTreemapTiles(
  context: ChartRenderContext,
  layout: TreemapLayout,
): { tiles: TreemapTile[]; headers: TreemapHeader[] } {
  if (!layout.leaves.some(leaf => leaf.group)) {
    const items = layout.leaves.map(leaf => ({ leaf, value: treemapLeafValue(leaf) }));
    const tiles = squarifyTreemap(items, { x: 0, y: 0, width: layout.gridWidth, height: layout.gridHeight });
    return { tiles, headers: [] };
  }

  const groupOrder: string[] = [];
  for (const leaf of layout.leaves) {
    const key = leaf.group ?? '';
    if (!groupOrder.includes(key)) {
      groupOrder.push(key);
    }
  }
  const groupItems = groupOrder.map(key => ({
    key,
    label: key || 'Other',
    value: layout.leaves
      .filter(leaf => (leaf.group ?? '') === key)
      .reduce((sum, leaf) => sum + treemapLeafValue(leaf), 0),
  }));
  const groupRects = squarifyTreemap(groupItems, { x: 0, y: 0, width: layout.gridWidth, height: layout.gridHeight });

  const tiles: TreemapTile[] = [];
  const headers: TreemapHeader[] = [];
  groupRects.forEach(groupRect => {
    const headerHeight = context.showLabels ? Math.min(HEADER_HEIGHT, groupRect.height) : 0;
    if (context.showLabels) {
      headers.push({
        key: groupRect.item.key,
        label: groupRect.item.label,
        x: groupRect.x,
        y: groupRect.y,
        width: groupRect.width,
      });
    }
    const innerLeaves = layout.leaves.filter(leaf => (leaf.group ?? '') === groupRect.item.key);
    const leafItems = innerLeaves.map(leaf => ({ leaf, value: treemapLeafValue(leaf) }));
    tiles.push(
      ...squarifyTreemap(leafItems, {
        x: groupRect.x,
        y: groupRect.y + headerHeight,
        width: groupRect.width,
        height: Math.max(0, groupRect.height - headerHeight),
      }),
    );
  });
  return { tiles, headers };
}

function renderTreemapHeader(context: ChartRenderContext, header: TreemapHeader, index: number): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const fill = chart.grid_color ?? '#e2e8f0';
  const background: RenderNode = {
    type: 'rect',
    id: `chart-treemap-header-${chart.id}-${index}`,
    order: nextOrder(),
    bounds,
    x: plot.x + header.x,
    y: plot.y + header.y,
    width: header.width,
    height: HEADER_HEIGHT,
    style: { fill: { kind: 'solid', color: fill } },
  };
  const smallFontSize = Math.max(8, Math.max(9, chart.font_size ?? 12) - 1);
  const label: RenderNode = {
    ...chartText({
      id: `chart-treemap-header-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: plot.x + header.x,
        y: plot.y + header.y + (HEADER_HEIGHT - smallFontSize) / 2,
        width: header.width,
        height: smallFontSize + 2,
      },
      text: header.label,
      chart,
      align: 'center',
    }),
    fontSize: smallFontSize,
    color: contrastTextColor(fill),
  };
  return [background, label];
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
    ...chartText({
      id: `chart-treemap-label-${chart.id}-${leaf.id}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: plot.x + tile.x + 4,
        y: plot.y + tile.y + 3,
        width,
        height: Math.max(1, tile.height - 6),
      },
      text: `${leaf.label} ${value}`,
      chart,
    }),
    lines: wrapText(`${leaf.label}\n${value}`, width, layout.smallFontSize),
    fontSize: layout.smallFontSize,
    color: contrastTextColor(representativeColor(color, '#ffffff')),
  };
}
