// Model adapter (plan Arbeitspaket C): SFL text -> RenderInput.
//
// This is the one piece the app does not have in a headless form. The app path
// is  sflToImportJson -> extractEntitiesFromJson (store/DOM-coupled). Here we
// consume the same v3 JSON the app produces and map it straight to the pure
// RenderInput the render core expects — no store, no DOM, no fork of app code.
//
// Known slice-1 gaps (documented, not hidden):
//   - Swimlanes: the app's SFL import already collapses swimlanes into frames
//     (sflToImportJson emits them via frameObject without lane data), so lanes
//     do not survive SFL round-trip yet. Rendered as frames.
//   - Link waypoints: v3 JSON carries segmentOffsets, not absolute waypoints, so
//     orthogonal links use the router's default routing rather than saved bends.
import type { Shape } from '@entities/shapes/model';
import type { Frame } from '@entities/frames/model';
import type { Table } from '@entities/tables/model';
import type { Link } from '@entities/links/model';
import type { Point, RenderInput, ResolvedExportLink } from '@features/content-io/export/rendering/renderScene';
import { sflToImportJson } from '@features/sfl-language/sfl';

interface EntityBuckets { shapes: unknown[]; links: unknown[] }
interface V3Json {
  canvas?: { entities?: { shapes?: unknown[]; links?: unknown[]; frames?: unknown[]; tables?: unknown[] } };
  layers?: { groups?: Array<{ entities?: EntityBuckets }> };
}

type PositionedElement = { id: string; x: number; y: number; width: number; height: number };

function pointFor(link: Link, end: 'from' | 'to', elements: PositionedElement[]): Point {
  const id = end === 'from' ? link.fromId : link.toId;
  const element = elements.find(item => item.id === id);
  const explicit = end === 'from' ? link.fromPoint : link.toPoint;
  if (explicit && 'isAbsolute' in explicit) return { x: explicit.x, y: explicit.y };
  if (!element) return { x: 0, y: 0 };
  if (explicit && 'side' in explicit) {
    switch (explicit.side) {
      case 'top': return { x: element.x + element.width * explicit.offset, y: element.y };
      case 'right': return { x: element.x + element.width, y: element.y + element.height * explicit.offset };
      case 'bottom': return { x: element.x + element.width * explicit.offset, y: element.y + element.height };
      case 'left': return { x: element.x, y: element.y + element.height * explicit.offset };
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
  const tables = (canvas.tables ?? []) as unknown as Table[];

  const positioned: PositionedElement[] = [...shapes, ...frames, ...tables] as unknown as PositionedElement[];
  const resolvedLinks: ResolvedExportLink[] = links.map(link => ({
    link,
    from: pointFor(link, 'from', positioned),
    to: pointFor(link, 'to', positioned),
  }));

  return { shapes, frames, swimlanes: [], tables, links: resolvedLinks };
}
