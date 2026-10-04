import type { Connection } from '../../model/connection';
import type { Point } from '../../model/geometry/types';
import { type IsometricObject, isometricFaceCenter, VISIBLE_ISOMETRIC_FACES } from '../../model/isometricObject';
import type { Link } from '../../model/link';
import type { RenderInputLink } from '../types';
import type { CollectedCanvasObjects } from './canvasObjects/collect';
import { resolveLinkEndpoint } from './endpoint';
import type { PositionedCanvasObject } from './types';

// Must match the isometric object's own order fallback in renderScene/artifacts/isometric.ts.
const ISOMETRIC_ORDER_BASE = 15_000;

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

function connectionEndpointPoint(object: IsometricObject | undefined, face: Connection['fromFace']): Point {
  return object ? isometricFaceCenter(object, face) : { x: 0, y: 0 };
}

function effectiveIsometricOrder(isometricObjects: IsometricObject[], id: string | undefined): number | undefined {
  const index = isometricObjects.findIndex(object => object.id === id);
  if (index < 0) {
    return undefined;
  }
  const object = isometricObjects[index];
  return typeof object.order === 'number' ? object.order : ISOMETRIC_ORDER_BASE + index;
}

// A hidden-face endpoint must render behind the object it's attached to.
function connectionOrder(isometricObjects: IsometricObject[], connection: Connection): number | undefined {
  if (typeof connection.order === 'number') {
    return connection.order;
  }
  const behindOrders = [
    VISIBLE_ISOMETRIC_FACES.has(connection.fromFace)
      ? undefined
      : effectiveIsometricOrder(isometricObjects, connection.fromId),
    VISIBLE_ISOMETRIC_FACES.has(connection.toFace)
      ? undefined
      : effectiveIsometricOrder(isometricObjects, connection.toId),
  ].filter((order): order is number => order !== undefined);
  return behindOrders.length ? Math.min(...behindOrders) - 0.5 : undefined;
}

function createRenderInputConnections(canvasObjects: CollectedCanvasObjects): RenderInputLink[] {
  const isometricById = new Map(canvasObjects.isometricObjects.map(object => [object.id, object]));
  return canvasObjects.connections.map(connection => {
    const link: Link = {
      id: connection.id,
      fromId: connection.fromId,
      toId: connection.toId,
      fromPoint: { kind: 'face', face: connection.fromFace },
      toPoint: { kind: 'face', face: connection.toFace },
      style: connection.style,
      order: connectionOrder(canvasObjects.isometricObjects, connection),
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
