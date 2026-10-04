import type { Connection } from '../../model/connection';
import type { Point } from '../../model/geometry/types';
import { type IsometricObject, isometricFaceCenter } from '../../model/isometricObject';
import type { Link } from '../../model/link';
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

// A Connection always names an exact face, so - unlike a Link - its endpoint
// resolution never needs the generic rect-bbox/side machinery: it's just a
// lookup of the two isometric objects plus isometricFaceCenter(). Once both
// points are known, a Connection renders through the exact same link
// pipeline as a real Link (see RenderInputLink.kind / renderScene/artifacts/link.ts).
function connectionEndpointPoint(object: IsometricObject | undefined, face: Connection['fromFace']): Point {
  return object ? isometricFaceCenter(object, face) : { x: 0, y: 0 };
}

function createRenderInputConnections(canvasObjects: CollectedCanvasObjects): RenderInputLink[] {
  const isometricById = new Map(canvasObjects.isometricObjects.map(object => [object.id, object]));
  return canvasObjects.connections.map(connection => {
    const link: Link = {
      id: connection.id,
      fromId: connection.fromId,
      toId: connection.toId,
      style: connection.style,
      order: connection.order,
    };
    return {
      link,
      from: connectionEndpointPoint(isometricById.get(connection.fromId ?? ''), connection.fromFace),
      to: connectionEndpointPoint(isometricById.get(connection.toId ?? ''), connection.toFace),
      kind: 'connection',
    };
  });
}

export function createRenderInputLinks(canvasObjects: CollectedCanvasObjects): RenderInputLink[] {
  const positionedObjects = positionedCanvasObjects(canvasObjects);
  const links = canvasObjects.links.map(link => ({
    link,
    from: resolveLinkEndpoint(link, 'from', positionedObjects),
    to: resolveLinkEndpoint(link, 'to', positionedObjects),
  }));
  return [...links, ...createRenderInputConnections(canvasObjects)];
}
