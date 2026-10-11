import type { Connection } from '../../model/connection';
import type { Point } from '../../model/geometry/types';
import { type IsometricObject, isometricFaceCenter, VISIBLE_ISOMETRIC_FACES } from '../../model/isometricObject';
import type { Link } from '../../model/link';
import type { RenderInputLink } from '../types';
import type { CollectedCanvasObjects } from './canvasObjects/collect';
import { resolveLinkEndpoint } from './endpoint';
import type { PositionedCanvasObject } from './types';

const ISOMETRIC_SEQUENCE_BASE = 15_000;

function positionedCanvasObjects(canvasObjects: CollectedCanvasObjects): PositionedCanvasObject[] {
  return [
    ...canvasObjects.shapes,
    ...canvasObjects.frames,
    ...canvasObjects.swimlanes,
    ...canvasObjects.paths,
    ...canvasObjects.charts,
  ];
}

function connectionEndpointPoint(object: IsometricObject | undefined, face: Connection['fromFace']): Point {
  return object ? isometricFaceCenter(object, face) : { x: 0, y: 0 };
}

interface StackPosition {
  rank: number;
  sequence: number;
}

function isometricStackPosition(isometricObjects: IsometricObject[], id: string | undefined): StackPosition | undefined {
  const index = isometricObjects.findIndex(object => object.id === id);
  if (index < 0) {
    return undefined;
  }
  const object = isometricObjects[index];
  return { rank: object.order ?? 0, sequence: object.sourceIndex ?? ISOMETRIC_SEQUENCE_BASE + index };
}

// A hidden-face endpoint must render behind the object it's attached to.
function connectionStack(
  isometricObjects: IsometricObject[],
  connection: Connection,
): Pick<Connection, 'order' | 'sourceIndex'> {
  if (typeof connection.order === 'number') {
    return { order: connection.order, sourceIndex: connection.sourceIndex };
  }
  const behind = [
    VISIBLE_ISOMETRIC_FACES.has(connection.fromFace)
      ? undefined
      : isometricStackPosition(isometricObjects, connection.fromId),
    VISIBLE_ISOMETRIC_FACES.has(connection.toFace)
      ? undefined
      : isometricStackPosition(isometricObjects, connection.toId),
  ].filter((position): position is StackPosition => position !== undefined);
  if (!behind.length) {
    return { sourceIndex: connection.sourceIndex };
  }
  const lowest = behind.reduce((best, position) =>
    position.rank < best.rank || (position.rank === best.rank && position.sequence < best.sequence) ? position : best,
  );
  return { order: lowest.rank, sourceIndex: lowest.sequence - 0.5 };
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
      ...connectionStack(canvasObjects.isometricObjects, connection),
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
