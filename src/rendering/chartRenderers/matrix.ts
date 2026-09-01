import type { RenderNode } from '../scene';
import { renderMatrixDividers } from './matrix/dividers';
import { createMatrixGeometry } from './matrix/geometry';
import { renderMatrixPoints } from './matrix/points';
import { renderMatrixZones } from './matrix/zones';
import type { ChartRenderContext } from './types';

export function renderMatrix(context: ChartRenderContext): RenderNode[] {
  const geometry = createMatrixGeometry(context);
  const nodes: RenderNode[] = [];

  nodes.push(...renderMatrixZones(context, geometry));
  nodes.push(...renderMatrixDividers(context, geometry));
  nodes.push(...renderMatrixPoints(context, geometry));

  return nodes;
}
