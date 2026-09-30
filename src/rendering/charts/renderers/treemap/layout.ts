import type { ChartSeries } from '../../../../model/charts';
import { finite } from '../../../scene';
import { axisBands, DEFAULT_HEATMAP_ZONES, zoneColorAtValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { TreemapLayout } from './types';

export function createTreemapLayout(context: ChartRenderContext): TreemapLayout {
  const { chart, plot, showLegend } = context;
  const fontSize = Math.max(9, finite(chart.font_size, 12));
  const legendPosition: 'bottom' | 'left' | 'right' =
    chart.legend_position === 'left' ? 'left' : chart.legend_position === 'right' ? 'right' : 'bottom';
  const legendHeight = showLegend && legendPosition === 'bottom' ? 48 : 0;
  const cellGap = Math.max(0, finite(chart.config?.cellGap, 0));
  return {
    leaves: chart.series,
    bands: axisBands(chart.axis_y),
    zones: chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES,
    fontSize,
    smallFontSize: Math.max(8, fontSize - 1),
    legendPosition,
    legendHeight,
    gridWidth: Math.max(1, plot.width),
    gridHeight: Math.max(1, plot.height - legendHeight),
    cellGap,
    cellRadius: Math.max(0, finite(chart.config?.barCornerRadius, cellGap)),
  };
}

export function treemapLeafValue(leaf: ChartSeries): number {
  return (leaf.values as number[])[0] ?? 0;
}

export function treemapLeafColor(leaf: ChartSeries, layout: TreemapLayout) {
  return leaf.color ?? zoneColorAtValue(treemapLeafValue(leaf), layout.bands, layout.zones);
}
