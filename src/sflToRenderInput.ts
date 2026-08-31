import type { Chart } from './model/charts';
import type { Frame } from './model/frames';
import { namedPortToPoint } from './model/geometry/router';
import type { Link } from './model/links';
import type { FreeformPath } from './model/paths';
import type { Shape, SymbolDef } from './model/shapes';
import type { Swimlane } from './model/swimlanes';
import type { Table } from './model/tables';
import type { Point, RenderDiagnostic, RenderInput, ResolvedExportLink } from './rendering/renderScene';
import { sflToImportJson } from './sfl';

interface EntityBuckets {
  shapes: unknown[];
  links: unknown[];
}
interface V3Json {
  canvas?: {
    entities?: {
      shapes?: unknown[];
      links?: unknown[];
      frames?: unknown[];
      swimlanes?: unknown[];
      tables?: unknown[];
      paths?: unknown[];
      charts?: unknown[];
    };
  };
  layers?: { groups?: Array<{ entities?: EntityBuckets }> };
  diagnostics?: RenderDiagnostic[];
}

type PositionedElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  symbol?: SymbolDef | null;
};

function pointFor(link: Link, end: 'from' | 'to', elements: PositionedElement[]): Point {
  const id = end === 'from' ? link.fromId : link.toId;
  const element = elements.find(item => item.id === id);
  const explicit = end === 'from' ? link.fromPoint : link.toPoint;
  if (explicit && 'isAbsolute' in explicit) return { x: explicit.x, y: explicit.y };
  if (!element) return { x: 0, y: 0 };
  if (explicit && 'isPort' in explicit) {
    const portDef = element.symbol?.ports?.find(p => p.name === explicit.port);
    if (portDef) {
      return namedPortToPoint(
        {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation ?? undefined,
        },
        portDef.at,
      );
    }
    return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  }
  if (explicit && 'side' in explicit) {
    const offset = explicit.offset ?? 0.5;
    switch (explicit.side) {
      case 'top':
        return { x: element.x + element.width * offset, y: element.y };
      case 'right':
        return { x: element.x + element.width, y: element.y + element.height * offset };
      case 'bottom':
        return { x: element.x + element.width * offset, y: element.y + element.height };
      case 'left':
        return { x: element.x, y: element.y + element.height * offset };
    }
  }
  const other = elements.find(item => item.id === (end === 'from' ? link.toId : link.fromId));
  if (!other) return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  return edgePointToward(element, other);
}

function edgePointToward(element: PositionedElement, other: PositionedElement): Point {
  const dx = other.x + other.width / 2 - (element.x + element.width / 2);
  const dy = other.y + other.height / 2 - (element.y + element.height / 2);
  const angle = Math.atan2(dy, dx);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4)
    return { x: element.x + element.width, y: element.y + element.height / 2 };
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4)
    return { x: element.x + element.width / 2, y: element.y + element.height };
  if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) return { x: element.x + element.width / 2, y: element.y };
  return { x: element.x, y: element.y + element.height / 2 };
}

export function sflToRenderInput(sfl: string): RenderInput {
  const json = sflToImportJson(sfl) as V3Json;
  const canvas = json.canvas?.entities ?? {};
  const groups = json.layers?.groups ?? [];

  const shapes = [
    ...(canvas.shapes ?? []),
    ...groups.flatMap(group => group.entities?.shapes ?? []),
  ] as unknown as Shape[];
  const links = [...(canvas.links ?? []), ...groups.flatMap(group => group.entities?.links ?? [])] as unknown as Link[];
  const frames = (canvas.frames ?? []) as unknown as Frame[];
  const swimlanes = (canvas.swimlanes ?? []) as unknown as Swimlane[];
  const tables = (canvas.tables ?? []) as unknown as Table[];
  const paths = (canvas.paths ?? []) as unknown as FreeformPath[];
  const charts = (canvas.charts ?? []) as unknown as Chart[];

  const positioned: PositionedElement[] = [
    ...shapes,
    ...frames,
    ...swimlanes,
    ...tables,
    ...paths,
    ...charts,
  ] as unknown as PositionedElement[];
  const resolvedLinks: ResolvedExportLink[] = links.map(link => ({
    link,
    from: pointFor(link, 'from', positioned),
    to: pointFor(link, 'to', positioned),
  }));

  return {
    shapes,
    frames,
    swimlanes,
    tables,
    paths,
    charts,
    links: resolvedLinks,
    diagnostics: json.diagnostics ?? [],
  };
}
