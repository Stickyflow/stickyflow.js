import type { Chart } from '../../../model/chart';
import type { SceneStyle } from '../../scene';

export function gridLineDashStyle(chart: Chart, width: number): Pick<SceneStyle, 'dash' | 'lineCap'> {
  if (chart.grid_line_style !== 'dashed') {
    return {};
  }
  const rounded = chart.grid_rounded_corners === true;
  return { dash: [width * 3, width * 2], lineCap: rounded ? 'round' : 'butt' };
}
