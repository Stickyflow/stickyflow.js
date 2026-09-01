import type { RenderNode, SceneStyle } from '../../renderScene';
import type { ChartRenderContext } from '../types';
import type { MatrixGeometry } from './types';

export function renderMatrixDividers(context: ChartRenderContext, geometry: MatrixGeometry): RenderNode[] {
  const style: SceneStyle = {
    fill: { kind: 'solid', color: context.chart.grid_color ?? '#e2e8f0' },
  };
  return [...renderVerticalDividers(context, geometry, style), ...renderHorizontalDividers(context, geometry, style)];
}

function renderVerticalDividers(
  context: ChartRenderContext,
  geometry: MatrixGeometry,
  style: SceneStyle,
): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const nodes: RenderNode[] = [];
  for (let bandIndex = 1; bandIndex < geometry.xBandCount; bandIndex++) {
    const x = geometry.xPixel(geometry.xBands[bandIndex]);
    nodes.push({
      type: 'rect',
      id: `chart-matrix-divider-x-${chart.id}-${bandIndex}`,
      order: nextOrder(),
      bounds,
      x: x - 0.5,
      y: plot.y,
      width: 1,
      height: plot.height,
      style,
    });
  }
  return nodes;
}

function renderHorizontalDividers(
  context: ChartRenderContext,
  geometry: MatrixGeometry,
  style: SceneStyle,
): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const nodes: RenderNode[] = [];
  for (let bandIndex = 1; bandIndex < geometry.yBandCount; bandIndex++) {
    const y = geometry.yPixel(geometry.yBands[bandIndex]);
    nodes.push({
      type: 'rect',
      id: `chart-matrix-divider-y-${chart.id}-${bandIndex}`,
      order: nextOrder(),
      bounds,
      x: plot.x,
      y: y - 0.5,
      width: plot.width,
      height: 1,
      style,
    });
  }
  return nodes;
}
