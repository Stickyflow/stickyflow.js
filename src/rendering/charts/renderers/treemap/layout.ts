import type { ChartSeries } from '../../../../model/charts';
import { finite } from '../../../renderPrimitives';
import { axisBands, bandIndexForValue, DEFAULT_HEATMAP_ZONES, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { TreemapLayout } from './types';

export function createTreemapLayout(context: ChartRenderContext): TreemapLayout {
  const { chart, plot, showLegend } = context;
  const fontSize = Math.max(9, finite(chart.font_size, 12));
  const legendHeight = showLegend ? 28 : 0;
  return {
    leaves: chart.series,
    bands: axisBands(chart.axis_y),
    zones: chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES,
    fontSize,
    smallFontSize: Math.max(8, fontSize - 1),
    legendHeight,
    gridWidth: Math.max(1, plot.width),
    gridHeight: Math.max(1, plot.height - legendHeight),
  };
}

export function treemapLeafValue(leaf: ChartSeries): number {
  return (leaf.values as number[])[0] ?? 0;
}

export function treemapLeafColor(leaf: ChartSeries, layout: TreemapLayout) {
  const zone = layout.zones[bandIndexForValue(treemapLeafValue(leaf), layout.bands)];
  return leaf.color ?? zone?.color ?? DEFAULT_ZONE_FILL;
}
