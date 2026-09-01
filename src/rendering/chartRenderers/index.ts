import type { ChartType } from '../../model/charts';
import type { RenderNode } from '../scene';
import { renderBar } from './bar';
import { renderBoxplot } from './boxplot';
import { renderCustom } from './custom';
import { renderField } from './field';
import { renderGrid } from './grid';
import { renderHeatmap } from './heatmap';
import { renderHexbin } from './hexbin';
import { renderLine } from './line';
import { renderMatrix } from './matrix';
import { renderMekko } from './mekko';
import { renderPie } from './pie';
import { renderRadar } from './radar';
import { renderSankey } from './sankey';
import { renderScatter } from './scatter';
import { renderTreemap } from './treemap';
import type { ChartRenderContext, ChartRenderer } from './types';

export type { ChartRenderContext, ChartRenderer } from './types';

const RENDERERS: Record<ChartType, ChartRenderer> = {
  bar: renderBar,
  boxplot: renderBoxplot,
  custom: renderCustom,
  field: renderField,
  grid: renderGrid,
  heatmap: renderHeatmap,
  hexbin: renderHexbin,
  line: renderLine,
  matrix: renderMatrix,
  mekko: renderMekko,
  pie: renderPie,
  radar: renderRadar,
  radial: renderRadar,
  sankey: renderSankey,
  scatter: renderScatter,
  treemap: renderTreemap,
};

const POLAR_TYPES: ReadonlySet<ChartType> = new Set<ChartType>(['radar', 'radial']);

export function isPolarChart(chartType: ChartType): boolean {
  return POLAR_TYPES.has(chartType);
}

export function renderChartMarks(context: ChartRenderContext): RenderNode[] {
  const renderer: ChartRenderer | undefined = RENDERERS[context.chart.chart_type];
  return renderer ? renderer(context) : [];
}
