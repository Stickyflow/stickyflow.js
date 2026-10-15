import type { PieChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { renderPieCenter } from './pie/center';
import { createPieGeometry } from './pie/geometry';
import { renderPieSlices } from './pie/slices';
import type { ChartRenderContext } from './types';

export function renderPie(context: ChartRenderContext<PieChart>): RenderNode[] {
  const geometry = createPieGeometry(context);
  return [...renderPieSlices(context, geometry), ...renderPieCenter(context, geometry)];
}
