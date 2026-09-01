import type { RenderNode } from '../renderScene';
import { classifyFieldData } from './field/data';
import { renderFieldLegend } from './field/legend';
import { renderScalarField } from './field/scalar';
import { renderVectorField } from './field/vectors';
import type { ChartRenderContext } from './types';

export function renderField(context: ChartRenderContext): RenderNode[] {
  const data = classifyFieldData(context);
  const nodes: RenderNode[] = [];

  nodes.push(...renderScalarField(context, data.scalarSamples));
  nodes.push(...renderVectorField(context, data.vectorSeries));
  nodes.push(...renderFieldLegend(context));

  return nodes;
}
