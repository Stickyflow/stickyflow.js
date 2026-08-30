// Model adapter (plan Arbeitspaket C): SFL text -> RenderInput.
//
// This is the one piece the app does not have in a headless form. The app path
// is  sflToImportJson -> extractEntitiesFromJson (store/DOM-coupled). Here we
// consume the same v3 JSON the app produces and map it straight to the pure
// RenderInput the render core expects — no store, no DOM, no fork of app code.
//
// Known gaps (documented, not hidden):
//   - Link waypoints: v3 JSON carries segmentOffsets, not absolute waypoints, so
//     orthogonal links use the router's default routing rather than saved bends.
//
// Swimlanes DO survive the SFL round-trip now: a `kind: swimlane` container with
// `orientation` + a `lanes: [[label, size, color?], …]` list is parsed into real
// lanes (sflToCanvasState) and emitted as a swimlane object (sflToImportJson),
// rendered by buildSwimlane rather than collapsed into a plain frame.
import type { Shape, SymbolDef } from './model/shapes';
import { namedPortToPoint } from './model/geometry/router';
import type { Frame } from './model/frames';
import type { Swimlane } from './model/swimlanes';
import type { Table } from './model/tables';
import type { Link } from './model/links';
import type { FreeformPath } from './model/paths';
import type { Chart } from './model/charts';
import type { Point, RenderDiagnostic, RenderInput, ResolvedExportLink } from './rendering/renderScene';
import { sflToImportJson } from './sfl';

interface EntityBuckets { shapes: unknown[]; links: unknown[] }
interface V3Json {
  canvas?: { entities?: { shapes?: unknown[]; links?: unknown[]; frames?: unknown[]; swimlanes?: unknown[]; tables?: unknown[]; paths?: unknown[]; charts?: unknown[] } };
  layers?: { groups?: Array<{ entities?: EntityBuckets }> };
  diagnostics?: RenderDiagnostic[];
}

// `rotation`/`symbol` are only ever present on a Shape (frames/swimlanes/
// tables/paths/charts don't carry them) - optional here rather than a
// separate type, since the caller builds this array from a mix of element
// kinds and a Named Port endpoint can only ever resolve against a Shape.
type PositionedElement = { id: string; x: number; y: number; width: number; height: number; rotation?: number | null; symbol?: SymbolDef | null };

function pointFor(link: Link, end: 'from' | 'to', elements: PositionedElement[]): Point {
  const id = end === 'from' ? link.fromId : link.toId;
  const element = elements.find(item => item.id === id);
  const explicit = end === 'from' ? link.fromPoint : link.toPoint;
  if (explicit && 'isAbsolute' in explicit) return { x: explicit.x, y: explicit.y };
  if (!element) return { x: 0, y: 0 };
  if (explicit && 'isPort' in explicit) {
    // §3.5 Named Ports: look up the port's normalized `at` on the target
    // entity's SymbolDef and go through the same rotation-aware transform as
    // the router (namedPortToPoint) - a missing symbol/port (e.g. the Symbol
    // definition changed after the link was authored) falls back to the
    // entity's center rather than leaving the endpoint at (0, 0).
    const portDef = element.symbol?.ports?.find(p => p.name === explicit.port);
    if (portDef) {
      return namedPortToPoint(
        { x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation ?? undefined },
        portDef.at,
      );
    }
    return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  }
  if (explicit && 'side' in explicit) {
    // Spec §10: the fraction in `side (fraction)` is optional, and a renderer
    // "may assume 0.5" when it's absent — `from: entity, right` alone is valid
    // SFL. `explicit.offset` is `undefined` in exactly that case (traced back
    // through sflToCanvasState's `fraction?: number`), and multiplying a width
    // by `undefined` silently produces NaN — not just for this one endpoint,
    // but for the whole scene once it poisons the bounds computed from it. This
    // is the only site that reads a parsed link's `.offset`; everywhere else
    // (getPathPoints, buildRenderScene) only reads `.side`.
    const offset = explicit.offset ?? 0.5;
    switch (explicit.side) {
      case 'top': return { x: element.x + element.width * offset, y: element.y };
      case 'right': return { x: element.x + element.width, y: element.y + element.height * offset };
      case 'bottom': return { x: element.x + element.width * offset, y: element.y + element.height };
      case 'left': return { x: element.x, y: element.y + element.height * offset };
    }
  }
  // No explicit endpoint. The centre of the element is the wrong answer here:
  // links are painted after entities, so a centre-to-centre segment is drawn
  // visibly THROUGH both shapes rather than between them. getPathPoints already
  // decides a side in exactly this case ("Fallback: Calculate best side based
  // on relative position"), but it only uses that side to shape the curve or
  // the elbow : the endpoints it is handed are these, so the two halves
  // disagreed. Same heuristic here, applied to the coordinates, so they agree.
  //
  // Both angles are taken between element CENTRES, which is what the side
  // choice is really about; using the resulting edge points to re-derive it
  // would be circular.
  const other = elements.find(item => item.id === (end === 'from' ? link.toId : link.fromId));
  if (!other) return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  return edgePointToward(element, other);
}

/** Midpoint of the edge of `element` facing `other`, picked by the same
 *  quadrant heuristic getPathPoints uses for a sideless endpoint. */
function edgePointToward(element: PositionedElement, other: PositionedElement): Point {
  const dx = (other.x + other.width / 2) - (element.x + element.width / 2);
  const dy = (other.y + other.height / 2) - (element.y + element.height / 2);
  const angle = Math.atan2(dy, dx);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return { x: element.x + element.width, y: element.y + element.height / 2 };
  if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) return { x: element.x + element.width / 2, y: element.y + element.height };
  if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) return { x: element.x + element.width / 2, y: element.y };
  return { x: element.x, y: element.y + element.height / 2 };
}

/** Parse SFL text and build the pure RenderInput consumed by buildRenderScene. */
export function sflToRenderInput(sfl: string): RenderInput {
  const json = sflToImportJson(sfl) as V3Json;
  const canvas = json.canvas?.entities ?? {};
  const groups = json.layers?.groups ?? [];

  const shapes = [
    ...(canvas.shapes ?? []),
    ...groups.flatMap(group => group.entities?.shapes ?? []),
  ] as unknown as Shape[];
  const links = [
    ...(canvas.links ?? []),
    ...groups.flatMap(group => group.entities?.links ?? []),
  ] as unknown as Link[];
  const frames = (canvas.frames ?? []) as unknown as Frame[];
  const swimlanes = (canvas.swimlanes ?? []) as unknown as Swimlane[];
  const tables = (canvas.tables ?? []) as unknown as Table[];
  const paths = (canvas.paths ?? []) as unknown as FreeformPath[];
  const charts = (canvas.charts ?? []) as unknown as Chart[];

  const positioned: PositionedElement[] = [...shapes, ...frames, ...swimlanes, ...tables, ...paths, ...charts] as unknown as PositionedElement[];
  const resolvedLinks: ResolvedExportLink[] = links.map(link => ({
    link,
    from: pointFor(link, 'from', positioned),
    to: pointFor(link, 'to', positioned),
  }));

  return { shapes, frames, swimlanes, tables, paths, charts, links: resolvedLinks, diagnostics: json.diagnostics ?? [] };
}
