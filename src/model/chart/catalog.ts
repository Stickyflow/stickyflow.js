export const CHART_TYPES = [
  'bar',
  'line',
  'scatter',
  'radar',
  'radial',
  'field',
  'heatmap',
  'boxplot',
  'sankey',
  'treemap',
  'mekko',
  'hexbin',
  'pie',
  'radialBar',
  'polarArea',
  'custom',
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export function isChartType(value: string | undefined): value is ChartType {
  return value !== undefined && (CHART_TYPES as readonly string[]).includes(value);
}

export const CIRCULAR_GRID_CHART_TYPES: ReadonlySet<ChartType> = new Set(['scatter', 'custom', 'hexbin']);
