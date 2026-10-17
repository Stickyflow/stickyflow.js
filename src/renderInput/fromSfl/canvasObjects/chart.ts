import type { Chart, ChartBase, TypedChart } from '../../../model/chart';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { chartBase } from './chartBase';
import {
  barConfig,
  boxplotConfig,
  customConfig,
  fieldConfig,
  heatmapConfig,
  hexbinConfig,
  lineConfig,
  mekkoConfig,
  pieConfig,
  polarAreaConfig,
  radarConfig,
  radialBarConfig,
  radialConfig,
  sankeyConfig,
  scatterConfig,
  treemapConfig,
} from './chartConfigs';

export function chartObject(e: SflCanvasObject): Chart {
  const base = chartBase(e);
  const source = e.chart;
  const p = e.props;
  const chartType = source?.chartType ?? 'bar';
  switch (chartType) {
    case 'bar':
      return typedChart(base, chartType, barConfig(source, p));
    case 'line':
      return typedChart(base, chartType, lineConfig(source, p));
    case 'scatter':
      return typedChart(base, chartType, scatterConfig(source, p));
    case 'boxplot':
      return typedChart(base, chartType, boxplotConfig(source, p));
    case 'field':
      return typedChart(base, chartType, fieldConfig(source));
    case 'heatmap':
      return typedChart(base, chartType, heatmapConfig(source, p));
    case 'hexbin':
      return typedChart(base, chartType, hexbinConfig(source, p));
    case 'mekko':
      return typedChart(base, chartType, mekkoConfig(source, p));
    case 'pie':
      return typedChart(base, chartType, pieConfig(source, p));
    case 'polarArea':
      return typedChart(base, chartType, polarAreaConfig(source, p));
    case 'radar':
      return typedChart(base, chartType, radarConfig(source, p));
    case 'radial':
      return typedChart(base, chartType, radialConfig(source, p));
    case 'radialBar':
      return typedChart(base, chartType, radialBarConfig(source, p));
    case 'sankey':
      return typedChart(base, chartType, sankeyConfig(source, p));
    case 'treemap':
      return typedChart(base, chartType, treemapConfig(source, p));
    case 'custom':
      return typedChart(base, chartType, customConfig(source, p));
  }
}

function typedChart<TType extends Chart['chartType'], TConfig extends object>(
  base: ChartBase,
  chartType: TType,
  config: TConfig,
): TypedChart<TType, TConfig> {
  return { ...base, chartType, config };
}
