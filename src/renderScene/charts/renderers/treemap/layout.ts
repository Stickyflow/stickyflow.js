import type { ChartSeries } from '../../../../model/chart';
import { finite } from '../../../scene';
import { axisBands, DEFAULT_HEATMAP_ZONES, zoneColorAtValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { TreemapLayout } from './types';

export function createTreemapLayout(context: ChartRenderContext): TreemapLayout {
  const { chart, plot, showLegend } = context;
  const fontSize = Math.max(9, finite(chart.fontSize, 12));
  const legendPosition: 'bottom' | 'left' | 'right' =
    chart.legendPosition === 'left' ? 'left' : chart.legendPosition === 'right' ? 'right' : 'bottom';
  const legendHeight = showLegend && legendPosition === 'bottom' ? 48 : 0;
  const cellGap = Math.max(0, finite(chart.config?.cellGap, 0));
  return {
    leaves: chart.series,
    bands: axisBands(chart.axisY),
    zones: chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES,
    fontSize,
    smallFontSize: Math.max(8, fontSize - 1),
    legendPosition,
    legendHeight,
    gridWidth: Math.max(1, plot.width),
    gridHeight: Math.max(1, plot.height - legendHeight),
    cellGap,
    cellRadius: Math.max(0, finite(chart.config?.barCornerRadius, cellGap)),
    headerHeight: Math.max(0, finite(chart.config?.headerHeight, 20)),
    labelSize: Math.max(6, finite(chart.config?.tileLabelSize, Math.max(8, fontSize - 1))),
    valueSize: Math.max(6, finite(chart.config?.tileValueSize, Math.max(8, fontSize - 1))),
    labelPadding: Math.max(0, finite(chart.config?.tileLabelPadding, 4)),
  };
}

export function treemapLeafValue(leaf: ChartSeries): number {
  return (leaf.values as number[])[0] ?? 0;
}

export function treemapLeafColor(leaf: ChartSeries, layout: TreemapLayout) {
  return leaf.color ?? zoneColorAtValue(treemapLeafValue(leaf), layout.bands, layout.zones);
}
