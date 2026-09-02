import type { ResolvedExportLink } from '../rendering/renderInput';
import type { CollectedEntities } from '../sfl/adapters/entities/collect';
import { resolveLinkEndpoint } from './endpoint';
import type { PositionedElement } from './types';

function positionedElements(entities: CollectedEntities): PositionedElement[] {
  return [
    ...entities.shapes,
    ...entities.frames,
    ...entities.swimlanes,
    ...entities.tables,
    ...entities.paths,
    ...entities.charts,
  ];
}

export function resolveExportLinks(entities: CollectedEntities): ResolvedExportLink[] {
  const elements = positionedElements(entities);
  return entities.links.map(link => ({
    link,
    from: resolveLinkEndpoint(link, 'from', elements),
    to: resolveLinkEndpoint(link, 'to', elements),
  }));
}
