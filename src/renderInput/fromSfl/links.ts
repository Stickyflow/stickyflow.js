import type { RenderInputLink } from '../types';
import type { CollectedCanvasObjects } from './canvasObjects/collect';
import { resolveLinkEndpoint } from './endpoint';
import type { PositionedCanvasObject } from './types';

function positionedCanvasObjects(canvasObjects: CollectedCanvasObjects): PositionedCanvasObject[] {
  return [
    ...canvasObjects.shapes,
    ...canvasObjects.frames,
    ...canvasObjects.swimlanes,
    ...canvasObjects.tables,
    ...canvasObjects.paths,
    ...canvasObjects.charts,
  ];
}

export function createRenderInputLinks(canvasObjects: CollectedCanvasObjects): RenderInputLink[] {
  const positionedObjects = positionedCanvasObjects(canvasObjects);
  return canvasObjects.links.map(link => ({
    link,
    from: resolveLinkEndpoint(link, 'from', positionedObjects),
    to: resolveLinkEndpoint(link, 'to', positionedObjects),
  }));
}
