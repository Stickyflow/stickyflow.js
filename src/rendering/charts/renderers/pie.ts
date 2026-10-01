import type { PieChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { createPieGeometry } from './pie/geometry';
import { renderPieSlices } from './pie/slices';
import type { ChartRenderContext } from './types';

export function renderPie(context: ChartRenderContext<PieChart>): RenderNode[] {
  return renderPieSlices(context, createPieGeometry(context));
}
