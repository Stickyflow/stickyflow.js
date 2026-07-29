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
import type { Shape } from './model/shapes';
import type { Frame } from './model/frames';
import type { Swimlane } from './model/swimlanes';
import type { Table } from './model/tables';
import type { Link } from './model/links';
import type { Point, RenderDiagnostic, RenderInput, ResolvedExportLink } from './rendering/renderScene';
import { sflToImportJson } from './sfl';

interface EntityBuckets { shapes: unknown[]; links: unknown[] }
interface V3Json {
  canvas?: { entities?: { shapes?: unknown[]; links?: unknown[]; frames?: unknown[]; swimlanes?: unknown[]; tables?: unknown[] } };
  layers?: { groups?: Array<{ entities?: EntityBuckets }> };
  diagnostics?: RenderDiagnostic[];
}

type PositionedElement = { id: string; x: number; y: number; width: number; height: number };

function pointFor(link: Link, end: 'from' | 'to', elements: PositionedElement[]): Point {
  const id = end === 'from' ? link.fromId : link.toId;
  const element = elements.find(item => item.id === id);
  const explicit = end === 'from' ? link.fromPoint : link.toPoint;
  if (explicit && 'isAbsolute' in explicit) return { x: explicit.x, y: explicit.y };
  if (!element) return { x: 0, y: 0 };
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
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
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

  const positioned: PositionedElement[] = [...shapes, ...frames, ...swimlanes, ...tables] as unknown as PositionedElement[];
  const resolvedLinks: ResolvedExportLink[] = links.map(link => ({
    link,
    from: pointFor(link, 'from', positioned),
    to: pointFor(link, 'to', positioned),
  }));

  return { shapes, frames, swimlanes, tables, links: resolvedLinks, diagnostics: json.diagnostics ?? [] };
}
