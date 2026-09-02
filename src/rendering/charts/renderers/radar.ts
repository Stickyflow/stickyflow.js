import type { RenderNode } from '../../scene';
import { createRadarGeometry } from './radar/geometry';
import { renderRadarGrid } from './radar/grid';
import { renderRadarLabels } from './radar/labels';
import { renderRadarSeries } from './radar/series';
import type { ChartRenderContext } from './types';

export function renderRadar(context: ChartRenderContext): RenderNode[] {
  const geometry = createRadarGeometry(context);
  const nodes: RenderNode[] = [];

  nodes.push(...renderRadarGrid(context, geometry));
  nodes.push(...renderRadarLabels(context, geometry));
  nodes.push(...renderRadarSeries(context, geometry));

  return nodes;
}
