import type { ChartSeries } from '../../../../model/chart';
import type { Bounds, RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { estimateTextWidth, wrapText } from '../../../scene/textLayout';
import { squarifyTreemap } from '../../geometry';
import { chartText, contrastTextColor, representativeColor, resolveChartShadow } from '../../primitives';
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
  const gradientFlow = Boolean(context.chart.config?.tileGradient);
  tiles.forEach((tile, index) => {
    const next = tiles[index + 1];
    const sameGroup = next && (tile.item.leaf.group ?? '') === (next.item.leaf.group ?? '');
    const nextTile = gradientFlow && sameGroup ? next : undefined;
    nodes.push(...renderTile(context, layout, tile, nextTile));
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
    const headerHeight = context.showLabels ? Math.min(layout.headerHeight, groupRect.height) : 0;
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
  const fill = chart.config?.headerColor ?? chart.gridColor ?? '#e2e8f0';
  const background: RenderNode = {
    type: 'rect',
    id: `chart-treemap-header-${chart.id}-${index}`,
    order: nextOrder(),
    bounds,
    x: plot.x + header.x,
    y: plot.y + header.y,
    width: header.width,
    height: layout.headerHeight,
    rx: layout.cellRadius,
    style: { fill: { kind: 'solid', color: fill } },
  };
  const smallFontSize = Math.max(8, Math.max(9, chart.fontSize ?? 12) - 1);
  const label: RenderNode = {
    ...chartText({
      id: `chart-treemap-header-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: plot.x + header.x,
        y: plot.y + header.y + (layout.headerHeight - smallFontSize) / 2,
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

function renderTile(
  context: ChartRenderContext,
  layout: TreemapLayout,
  tile: TreemapTile,
  nextTile: TreemapTile | undefined,
): RenderNode[] {
  const color = treemapLeafColor(tile.item.leaf, layout);
  const nextColor = nextTile ? treemapLeafColor(nextTile.item.leaf, layout) : undefined;
  const nodes = [createTileNode(context, layout, tile, color, nextColor)];
  if (context.showLabels && tile.width >= 34 && tile.height >= 18) {
    nodes.push(...createTileLabel(context, layout, tile, color));
  }
  return nodes;
}

function createTileNode(
  context: ChartRenderContext,
  layout: TreemapLayout,
  tile: TreemapTile,
  color: Parameters<typeof representativeColor>[0],
  nextColor: Parameters<typeof representativeColor>[0] | undefined,
): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const gap = layout.cellGap;
  const shadow = resolveChartShadow(chart.shadowStyle);
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;
  const tileX = plot.x + tile.x + gap / 2;
  const tileY = plot.y + tile.y + gap / 2;
  const tileWidth = Math.max(0, tile.width - gap);
  const tileHeight = Math.max(0, tile.height - gap);
  const fallback = '#94a3b8';
  const gradientBounds: Bounds = {
    minX: tileX,
    maxX: tileX + tileWidth,
    minY: tileY + tileHeight / 2 - tileWidth / 2,
    maxY: tileY + tileHeight / 2 + tileWidth / 2,
  };
  const fill = nextColor
    ? {
        kind: 'linear-gradient' as const,
        angle: 0,
        stops: [
          { offset: 0, color: representativeColor(color, fallback) },
          { offset: 100, color: representativeColor(nextColor, fallback) },
        ],
      }
    : paint(color, diagnostics, chart.id);
  return {
    type: 'rect',
    id: `chart-treemap-tile-${chart.id}-${tile.item.leaf.id}`,
    order: nextOrder(),
    bounds: nextColor ? gradientBounds : bounds,
    x: tileX,
    y: tileY,
    width: tileWidth,
    height: tileHeight,
    rx: layout.cellRadius,
    style: {
      fill,
      stroke: { kind: 'solid', color: chart.config?.tileStrokeColor ?? chart.gridColor ?? '#e2e8f0' },
      strokeWidth: finite(chart.config?.tileStrokeWidth, finite(chart.gridWidth, 1)),
      shadow,
      clip: clipPath ? { type: 'path', d: clipPath } : undefined,
    },
  };
}

function fitLine(text: string, width: number, fontSize: number, bold: boolean): string {
  if (estimateTextWidth(text, fontSize, bold) <= width) {
    return text;
  }
  let end = text.length;
  while (end > 1 && estimateTextWidth(`${text.slice(0, end)}…`, fontSize, bold) > width) {
    end -= 1;
  }
  return `${text.slice(0, end)}…`;
}

function createTileLabel(
  context: ChartRenderContext,
  layout: TreemapLayout,
  tile: TreemapTile,
  color: Parameters<typeof representativeColor>[0],
): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const { leaf, value } = tile.item;
  const gap = layout.cellGap;
  const pad = layout.labelPadding;
  const width = Math.max(1, tile.width - gap - pad * 2);
  const height = Math.max(1, tile.height - gap - pad * 1.5);
  const x = plot.x + tile.x + gap / 2 + pad;
  const y = plot.y + tile.y + gap / 2 + pad * 0.75;
  const textColor = chart.config?.tileTextColor ?? contrastTextColor(representativeColor(color, '#ffffff'));
  const lineHeight = layout.labelSize * 1.2;
  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  const labelLines = wrapText(leaf.label, width, layout.labelSize)
    .slice(0, maxLines)
    .map(line => fitLine(line, width, layout.labelSize, true));

  const label: RenderNode = {
    ...chartText({
      id: `chart-treemap-label-${chart.id}-${leaf.id}`,
      order: nextOrder(),
      bounds,
      frame: { x, y, width, height },
      text: leaf.label,
      chart,
    }),
    lines: labelLines,
    fontSize: layout.labelSize,
    fontWeight: 'bold',
    color: textColor,
  };

  const valueText = String(value);
  const valueFits =
    labelLines.length * lineHeight + layout.valueSize * 1.2 <= height + 2 &&
    estimateTextWidth(valueText, layout.valueSize, false) <= width;
  if (chart.config?.showTileValues === false || !valueFits) {
    return [label];
  }

  const valueNode: RenderNode = {
    ...chartText({
      id: `chart-treemap-value-${chart.id}-${leaf.id}`,
      order: nextOrder(),
      bounds,
      frame: {
        x,
        y: y + labelLines.length * lineHeight,
        width,
        height: Math.max(1, height - labelLines.length * lineHeight),
      },
      text: String(value),
      chart,
    }),
    lines: [String(value)],
    fontSize: layout.valueSize,
    color: textColor,
  };

  return [label, valueNode];
}
