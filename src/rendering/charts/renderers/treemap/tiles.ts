import type { ChartSeries } from '../../../../model/charts';
import { wrapText } from '../../../../model/geometry/text';
import { squarifyTreemap } from '../../../../model/geometry/treemap';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
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
    nodes.push(...renderTreemapHeader(context, layout, header, index));
  });
  return nodes;
}

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

  const groupGap = layout.cellGap;

  const tiles: TreemapTile[] = [];
  const headers: TreemapHeader[] = [];
  groupRects.forEach(groupRect => {
    const headerHeight = context.showLabels ? Math.min(HEADER_HEIGHT, groupRect.height) : 0;
    if (context.showLabels) {
      headers.push({
        key: groupRect.item.key,
        label: groupRect.item.label,
        x: groupRect.x + groupGap / 2,
        y: groupRect.y,
        width: Math.max(0, groupRect.width - groupGap),
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

function renderTreemapHeader(
  context: ChartRenderContext,
  layout: TreemapLayout,
  header: TreemapHeader,
  index: number,
): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const fill = chart.config?.headerColor ?? chart.grid_color ?? '#e2e8f0';
  const background: RenderNode = {
    type: 'rect',
    id: `chart-treemap-header-${chart.id}-${index}`,
    order: nextOrder(),
    bounds,
    x: plot.x + header.x,
    y: plot.y + header.y,
    width: header.width,
    height: HEADER_HEIGHT,
    rx: layout.cellRadius,
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
  const nodes = [createTileNode(context, layout, tile, color)];
  if (context.showLabels && tile.width >= 34 && tile.height >= 18) {
    nodes.push(createTileLabel(context, layout, tile, color));
  }
  return nodes;
}

function createTileNode(
  context: ChartRenderContext,
  layout: TreemapLayout,
  tile: TreemapTile,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const gap = layout.cellGap;
  return {
    type: 'rect',
    id: `chart-treemap-tile-${chart.id}-${tile.item.leaf.id}`,
    order: nextOrder(),
    bounds,
    x: plot.x + tile.x + gap / 2,
    y: plot.y + tile.y + gap / 2,
    width: Math.max(0, tile.width - gap),
    height: Math.max(0, tile.height - gap),
    rx: layout.cellRadius,
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: finite(chart.grid_width, 1),
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
  const gap = layout.cellGap;
  const width = Math.max(1, tile.width - gap - 8);
  return {
    ...chartText({
      id: `chart-treemap-label-${chart.id}-${leaf.id}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: plot.x + tile.x + gap / 2 + 4,
        y: plot.y + tile.y + gap / 2 + 3,
        width,
        height: Math.max(1, tile.height - gap - 6),
      },
      text: `${leaf.label} ${value}`,
      chart,
    }),
    lines: wrapText(`${leaf.label}\n${value}`, width, layout.smallFontSize),
    fontSize: layout.smallFontSize,
    color: contrastTextColor(representativeColor(color, '#ffffff')),
  };
}
