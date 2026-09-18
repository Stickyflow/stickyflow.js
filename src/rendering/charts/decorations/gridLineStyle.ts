import type { Chart } from '../../../model/charts';
import type { SceneStyle } from '../../scene';

export function gridLineDashStyle(chart: Chart, width: number): Pick<SceneStyle, 'dash' | 'lineCap'> {
  const rounded = chart.grid_rounded_corners === true;
  if (chart.grid_line_style === 'dashed') {
    return { dash: [width * 3, width * 2], lineCap: rounded ? 'round' : 'butt' };
  }
  if (chart.grid_line_style === 'dotted') {
    return rounded ? { dash: [0.001, width * 2.5], lineCap: 'round' } : { dash: [width, width * 2], lineCap: 'butt' };
  }
  return {};
}
