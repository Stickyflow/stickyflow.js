import type { RenderInput } from '../../renderInput/types';
import { buildContainers } from '../artifacts/containers';
import { buildIsometricObjects } from '../artifacts/isometric';
import { buildLinks } from '../artifacts/link';
import { buildFreeformPaths } from '../artifacts/path';
import { buildShapes } from '../artifacts/shape';
import { buildCharts } from '../charts';
import { buildTables } from '../tables';
import { EMPTY_BOUNDS } from './bounds';
import type { MeasureTextFactory } from './textMetrics';
import type { Bounds, RenderDiagnostic, RenderNode, RenderScene } from './types';

function sceneBounds(nodes: RenderNode[]): Bounds {
  if (!nodes.length) {
    return EMPTY_BOUNDS;
  }
  return {
    minX: Math.min(...nodes.map(n => n.bounds.minX)),
    minY: Math.min(...nodes.map(n => n.bounds.minY)),
    maxX: Math.max(...nodes.map(n => n.bounds.maxX)),
    maxY: Math.max(...nodes.map(n => n.bounds.maxY)),
  };
}

export interface BuildRenderSceneOptions {
  measureText?: MeasureTextFactory;
}

export function buildRenderScene(input: RenderInput, options: BuildRenderSceneOptions = {}): RenderScene {
  const { measureText } = options;
  const diagnostics: RenderDiagnostic[] = [...(input.diagnostics ?? [])];
  const nodes = [
    ...buildContainers(input),
    ...buildTables(input.tables ?? []),
    ...buildFreeformPaths(input.paths ?? []),
    ...buildCharts(input.charts ?? [], diagnostics),
    ...buildLinks(input.links, measureText),
    ...buildShapes(input.shapes, diagnostics, measureText),
    ...buildIsometricObjects(input.isometricObjects ?? []),
  ].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}
