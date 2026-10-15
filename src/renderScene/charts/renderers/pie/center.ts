import type { PieChart } from '../../../../model/chart';
import type { RenderNode, SceneText } from '../../../scene';
import { DEFAULT_FONT, finite } from '../../../scene';
import type { ChartRenderContext } from '../types';
import type { PieGeometry } from './types';

function fill(template: string, chart: PieChart): string {
  const values = chart.series.map(series => Math.max(0, finite((series.values as number[])[0], 0)));
  const total = values.reduce((sum, value) => sum + value, 0);
  const first = values[0] ?? 0;
  return template
    .replace(/\{total\}/g, String(Math.round(total * 100) / 100))
    .replace(/\{percent\}/g, String(total > 0 ? Math.round((first / total) * 100) : 0))
    .replace(/\{label\}/g, chart.series[0]?.label ?? '');
}

export function renderPieCenter(context: ChartRenderContext<PieChart>, geometry: PieGeometry): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const template = chart.config?.pieCenterText;
  if (!template) {
    return [];
  }
  const lines = fill(template, chart).split(/\\n|\n/);
  const fontSize = finite(chart.config?.pieCenterSize, Math.max(14, Math.min(40, geometry.outerRadius * 0.3)));
  const lineHeight = fontSize * 1.2;
  const width = Math.max(40, (geometry.innerRadius > 0 ? geometry.innerRadius : geometry.outerRadius * 0.6) * 2);
  const text: SceneText = {
    type: 'text',
    id: `chart-pie-center-${chart.id}`,
    order: nextOrder(),
    bounds,
    x: geometry.centerX - width / 2,
    y: geometry.centerY - (lineHeight * lines.length) / 2,
    width,
    height: lineHeight * lines.length,
    lines,
    fontFamily: chart.fontFamily ?? DEFAULT_FONT,
    fontSize,
    fontWeight: 'bold',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    color: chart.config?.pieCenterColor ?? chart.textColor ?? '#0f172a',
    detail: { of: 'chartSeries', series: chart.series[0]?.id ?? '', mark: 'pie-center' },
  };
  return [text];
}
