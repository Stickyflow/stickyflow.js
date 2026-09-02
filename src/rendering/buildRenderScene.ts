import type { MeasureTextFactory } from '../model/geometry/text';
import type { RenderInput } from '../renderInput/types';
import { buildChart } from './charts';
import { buildFrame, buildSwimlane } from './entities/containers';
import { buildLink } from './entities/link';
import { buildFreeformPath } from './entities/path';
import { buildShape } from './entities/shape';
import { buildTable } from './entities/table';
import { EMPTY_BOUNDS, tag } from './renderPrimitives';
import type { Bounds, RenderDiagnostic, RenderNode, RenderScene } from './scene';

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
    ...input.frames.flatMap((frame, i) =>
      tag(buildFrame(frame, i), 'frame', frame.id, undefined, frame.title ?? undefined),
    ),
    ...input.swimlanes.flatMap((swimlane, i) => tag(buildSwimlane(swimlane, i), 'swimlane', swimlane.id)),
    ...(input.tables ?? []).flatMap((table, i) =>
      tag(buildTable(table, i), 'table', table.id, undefined, table.title ?? undefined),
    ),
    ...(input.paths ?? []).flatMap((path, i) => tag(buildFreeformPath(path, i), 'path', path.id, 'path', 'Path')),
    ...(input.charts ?? []).flatMap((chart, i) =>
      tag(buildChart(chart, i, diagnostics), 'chart', chart.id, chart.chart_type, chart.title ?? 'Chart'),
    ),
    ...input.links.flatMap((item, i) =>
      tag(
        buildLink(item, i, measureText),
        'link',
        item.link.id,
        undefined,
        item.link.text || `${item.link.fromId} → ${item.link.toId}`,
      ),
    ),
    ...input.shapes.flatMap((shape, index) =>
      tag(
        buildShape(shape, index, diagnostics, measureText),
        'entity',
        shape.id,
        shape.shapeType,
        shape.text || shape.shapeType,
      ),
    ),
  ].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}
