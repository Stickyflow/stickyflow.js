import type { ChartType, HexbinChart, PieChart, RadarChart, RadialBarChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { renderBar } from './bar';
import { renderBoxplot } from './boxplot';
import { renderCustom } from './custom';
import { renderField } from './field';
import { renderHeatmap } from './heatmap';
import { renderHexbin } from './hexbin';
import { renderLine } from './line';
import { renderMekko } from './mekko';
import { renderPie } from './pie';
import { renderPolarArea } from './polarArea';
import { renderRadar } from './radar';
import { renderRadialBar } from './radialBar';
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
  heatmap: renderHeatmap,
  hexbin: context => renderHexbin(context as ChartRenderContext<HexbinChart>),
  line: renderLine,
  mekko: renderMekko,
  pie: context => renderPie(context as ChartRenderContext<PieChart>),
  polarArea: context => renderPolarArea(context as ChartRenderContext<PieChart>),
  radar: context => renderRadar(context as ChartRenderContext<RadarChart>),
  radial: context => renderRadar(context as ChartRenderContext<RadarChart>),
  radialBar: context => renderRadialBar(context as ChartRenderContext<RadialBarChart>),
  sankey: renderSankey,
  scatter: renderScatter,
  treemap: renderTreemap,
};

const POLAR_TYPES: ReadonlySet<ChartType> = new Set<ChartType>(['radar', 'radial']);

export function isPolarChart(chartType: ChartType): boolean {
  return POLAR_TYPES.has(chartType);
}

export function renderChartMarks(context: ChartRenderContext): RenderNode[] {
  return RENDERERS[context.chart.chartType](context);
}
