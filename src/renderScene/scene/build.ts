import type { RenderInput } from '../../renderInput/types';
import { buildComponents } from '../artifacts/component';
import { buildContainers } from '../artifacts/containers';
import { buildIsometricObjects } from '../artifacts/isometric';
import { buildLinks } from '../artifacts/link';
import { buildFreeformPaths } from '../artifacts/path';
import { buildShapes } from '../artifacts/shape';
import { buildCharts } from '../charts';
import { EMPTY_BOUNDS } from './bounds';
import { stackRank, stackSequence } from './order';
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

interface Stacking {
  rank: number;
  sequence: number;
}

function stackingOf(input: RenderInput): Map<string, Stacking> {
  const stacking = new Map<string, Stacking>();
  const add = (
    role: string,
    objects: ReadonlyArray<Parameters<typeof stackRank>[0] & { id: string }>,
    legacyBase: number,
  ): void => {
    objects.forEach((object, index) => {
      stacking.set(`${role}:${object.id}`, {
        rank: stackRank(object),
        sequence: stackSequence(object, legacyBase + index),
      });
    });
  };
  add('frame', input.frames, 0);
  add('swimlane', input.swimlanes, 5_000);
  add('shape', input.shapes, 10_000);
  add('widget', input.components ?? input.widgets ?? [], 10_000);
  add('isometric', input.isometricObjects ?? [], 15_000);
  add(
    'link',
    input.links.map(item => item.link),
    20_000,
  );
  add('chart', input.charts ?? [], 20_000);
  add('path', input.paths ?? [], 30_000);
  return stacking;
}

function stampStacking(nodes: RenderNode[], input: RenderInput): void {
  const stacking = stackingOf(input);
  for (const node of nodes) {
    const stack = node.identity ? stacking.get(`${node.identity.role}:${node.identity.id}`) : undefined;
    node.rank = stack?.rank ?? 0;
    node.sequence = stack?.sequence ?? 0;
  }
}

export interface BuildRenderSceneOptions {
  measureText?: MeasureTextFactory;
}

export function buildRenderScene(input: RenderInput, options: BuildRenderSceneOptions = {}): RenderScene {
  const { measureText } = options;
  const diagnostics: RenderDiagnostic[] = [...(input.diagnostics ?? [])];
  const nodes: RenderNode[] = [
    ...buildContainers(input),
    ...buildFreeformPaths(input.paths ?? []),
    ...buildCharts(input.charts ?? [], diagnostics),
    ...buildLinks(input.links, measureText),
    ...buildShapes(input.shapes, diagnostics, measureText),
    ...buildComponents(input.components ?? input.widgets ?? []),
    ...buildIsometricObjects(input.isometricObjects ?? []),
  ];
  stampStacking(nodes, input);
  nodes.sort(
    (a, b) =>
      (a.rank ?? 0) - (b.rank ?? 0) ||
      (a.sequence ?? 0) - (b.sequence ?? 0) ||
      a.order - b.order ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}
