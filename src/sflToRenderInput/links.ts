import type { ResolvedExportLink } from '../rendering/renderInput';
import { resolveLinkEndpoint } from './endpoint';
import type { PositionedElement, RenderEntities } from './types';

function positionedElements(entities: RenderEntities): PositionedElement[] {
  return [
    ...entities.shapes,
    ...entities.frames,
    ...entities.swimlanes,
    ...entities.tables,
    ...entities.paths,
    ...entities.charts,
  ] as unknown as PositionedElement[];
}

export function resolveExportLinks(entities: RenderEntities): ResolvedExportLink[] {
  const elements = positionedElements(entities);
  return entities.links.map(link => ({
    link,
    from: resolveLinkEndpoint(link, 'from', elements),
    to: resolveLinkEndpoint(link, 'to', elements),
  }));
}
