import type { Shape } from '../model/shapes';
import { SHAPE_DEFAULTS } from '../model/shapes';
import type { Frame } from '../model/frames';
import type { Link, MarkerType } from '../model/links';
import { getLinkStrokeColor } from '../model/links';
import type { Swimlane } from '../model/swimlanes';
import { computeRowHeight, type Table } from '../model/tables';
import type { FreeformPath } from '../model/paths';
import { colorAtRamp } from './field';
import { tableBorderGeometry } from '../model/geometry/tables';
import { localShapePath } from '../model/geometry/shapes';
import { wrapText, heuristicRichMeasure, type MeasureTextFactory } from '../model/geometry/text';
import { hasBoldMarkup, wrapRichText } from '../model/geometry/richText';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash, roundedOrthogonalPathData } from '../model/geometry/connectionLine';
import type { PathSegment } from '../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene,
  ScenePath, SceneStyle, SceneText,
} from './renderScene';
import { DEFAULT_FONT, EMPTY_BOUNDS, finite, orderOf, boxBounds, rotatedBounds, paint, freeformPathData, tag } from './renderPrimitives';
import { buildChart } from './charts';

import { buildShape } from './sceneRenderers/shape';
import { buildFrame, buildSwimlane } from './sceneRenderers/containers';
import { buildTable } from './sceneRenderers/table';
import { buildFreeformPath } from './sceneRenderers/path';
import { buildLink } from './sceneRenderers/link';

function sceneBounds(nodes: RenderNode[]): Bounds {
  if (!nodes.length) return EMPTY_BOUNDS;
  return { minX: Math.min(...nodes.map(n => n.bounds.minX)), minY: Math.min(...nodes.map(n => n.bounds.minY)), maxX: Math.max(...nodes.map(n => n.bounds.maxX)), maxY: Math.max(...nodes.map(n => n.bounds.maxY)) };
}

export interface BuildRenderSceneOptions {
  /** Supply real glyph metrics for text wrapping instead of this package's
   *  character-count heuristic. See `MeasureTextFactory` — omitting it is what
   *  keeps output byte-identical across platforms. */
  measureText?: MeasureTextFactory;
}

export function buildRenderScene(input: RenderInput, options: BuildRenderSceneOptions = {}): RenderScene {
  const { measureText } = options;
  // Diagnostics already known before scene-building starts (e.g. an
  // unresolved Style/Layout ref from sflToCanvasState) merge with whatever
  // this function discovers on its own below (empty-mesh-gradient, etc.).
  const diagnostics: RenderDiagnostic[] = [...(input.diagnostics ?? [])];
  const nodes = [
    ...input.frames.flatMap((frame, i) => tag(buildFrame(frame, i), 'frame', frame.id, undefined, frame.title ?? undefined)),
    ...input.swimlanes.flatMap((swimlane, i) => tag(buildSwimlane(swimlane, i), 'swimlane', swimlane.id)),
    ...(input.tables ?? []).flatMap((table, i) => tag(buildTable(table, i), 'table', table.id, undefined, table.title ?? undefined)),
    ...(input.paths ?? []).flatMap((path, i) => tag(buildFreeformPath(path, i), 'path', path.id, 'path', 'Path')),
    ...(input.charts ?? []).flatMap((chart, i) => tag(buildChart(chart, i, diagnostics), 'chart', chart.id, chart.chart_type, chart.title ?? 'Chart')),
    // Falls back to "fromId → toId" rather than leaving ariaLabel undefined
    // for an unlabeled link (most of them — `text:` is optional): tag()'s own
    // tabindex is gated on ariaLabel being present, so a link with no text
    // was never focusable at all, and stickyflow/interaction's Backspace
    // handler needs focus (see viewer/interaction.ts's onPointerUp) — an
    // unlabeled link could be SELECTED by clicking it but never actually
    // deleted with the keyboard. Shapes don't have this gap since they
    // already fall back to their own shapeType a few lines below.
    ...input.links.flatMap((item, i) => tag(buildLink(item, i, measureText), 'link', item.link.id, undefined, item.link.text || `${item.link.fromId} → ${item.link.toId}`)),
    ...input.shapes.flatMap((shape, index) => tag(buildShape(shape, index, diagnostics, measureText), 'entity', shape.id, shape.shapeType, shape.text || shape.shapeType)),
    // Locale-independent code-point tie-break (ADR-02): localeCompare depends on
    // the host ICU/locale and could reorder equal-order nodes across machines.
  ].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, bounds: sceneBounds(nodes), diagnostics };
}


