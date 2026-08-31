import type { ChartRenderContext, StackedMode } from './types';
import { renderBar } from './bar';
import { renderBoxplot } from './boxplot';
import { renderCartesian } from './cartesian';
import { renderCustom } from './custom';
import { renderField } from './field';
import { renderHeatmap } from './heatmap';
import { renderHexbin } from './hexbin';
import { renderGrid } from './grid';
import { renderLine } from './line';
import { renderMatrix } from './matrix';
import { renderMekko } from './mekko';
import { renderPie } from './pie';
import { renderRadar } from './radar';
import { renderSankey } from './sankey';
import { renderScatter } from './scatter';
import { renderTreemap } from './treemap';

export { renderRadar };
export type { ChartRenderContext } from './types';

export function renderChartMarks(context: ChartRenderContext, stackedMode?: StackedMode) {
  switch (context.chart.chart_type) {
    case 'field': return renderField(context);
    case 'heatmap': return renderHeatmap(context);
    case 'sankey': return renderSankey(context);
    case 'mekko': return renderMekko(context);
    case 'treemap': return renderTreemap(context);
    case 'boxplot': return renderBoxplot(context);
    case 'hexbin': return renderHexbin(context);
    case 'grid': return renderGrid(context);
    case 'line': return renderLine(context);
    case 'scatter': return renderScatter(context);
    case 'pie': return renderPie(context);
    case 'matrix': return renderMatrix(context);
    case 'custom': return renderCustom(context);
    case 'bar': return renderBar(context, stackedMode);
    default: return renderCartesian(context);
  }
}
