import { pointAtNormalizedPort } from '../../model/geometry/ports';
import { edgePointToward, elementCenter } from '../../model/geometry/rectangle';
import type { Point } from '../../model/geometry/types';
import type { Link } from '../../model/link';
import type { PositionedCanvasObject } from './types';

type LinkEndpoint = NonNullable<Link['fromPoint']>;
type LinkEnd = 'from' | 'to';

interface SelectedLinkEndpoint {
  canvasObjectId: string | undefined;
  oppositeCanvasObjectId: string | undefined;
  explicit: LinkEndpoint | undefined;
}

function sidePoint(canvasObject: PositionedCanvasObject, endpoint: Extract<LinkEndpoint, { side: unknown }>): Point {
  const offset = endpoint.offset ?? 0.5;
  switch (endpoint.side) {
    case 'top':
      return { x: canvasObject.x + canvasObject.width * offset, y: canvasObject.y };
    case 'right':
      return { x: canvasObject.x + canvasObject.width, y: canvasObject.y + canvasObject.height * offset };
    case 'bottom':
      return { x: canvasObject.x + canvasObject.width * offset, y: canvasObject.y + canvasObject.height };
    case 'left':
      return { x: canvasObject.x, y: canvasObject.y + canvasObject.height * offset };
  }
}

function namedPortPoint(
  canvasObject: PositionedCanvasObject,
  endpoint: Extract<LinkEndpoint, { kind: 'port' }>,
): Point {
  const port = canvasObject.symbol?.ports?.find(candidate => candidate.name === endpoint.port);
  if (!port) {
    return elementCenter(canvasObject);
  }
  return pointAtNormalizedPort(
    {
      x: canvasObject.x,
      y: canvasObject.y,
      width: canvasObject.width,
      height: canvasObject.height,
      rotation: canvasObject.rotation ?? undefined,
    },
    port.at,
  );
}

export function resolveLinkEndpoint(link: Link, end: LinkEnd, canvasObjects: PositionedCanvasObject[]): Point {
  const selected = selectLinkEndpoint(link, end);
  const absolutePoint = explicitAbsolutePoint(selected.explicit);
  if (absolutePoint) {
    return absolutePoint;
  }
  const canvasObject = findPositionedCanvasObject(canvasObjects, selected.canvasObjectId);
  if (!canvasObject) {
    return { x: 0, y: 0 };
  }
  const anchoredPoint = explicitAnchorPoint(canvasObject, selected.explicit);
  if (anchoredPoint) {
    return anchoredPoint;
  }
  return automaticEndpointPoint(
    canvasObject,
    findPositionedCanvasObject(canvasObjects, selected.oppositeCanvasObjectId),
  );
}

function selectLinkEndpoint(link: Link, end: LinkEnd): SelectedLinkEndpoint {
  return end === 'from'
    ? { canvasObjectId: link.fromId, oppositeCanvasObjectId: link.toId, explicit: link.fromPoint }
    : { canvasObjectId: link.toId, oppositeCanvasObjectId: link.fromId, explicit: link.toPoint };
}

function explicitAbsolutePoint(endpoint: LinkEndpoint | undefined): Point | null {
  return endpoint?.kind === 'absolute' ? { x: endpoint.x, y: endpoint.y } : null;
}

function explicitAnchorPoint(canvasObject: PositionedCanvasObject, endpoint: LinkEndpoint | undefined): Point | null {
  if (endpoint?.kind === 'port') {
    return namedPortPoint(canvasObject, endpoint);
  }
  if (endpoint?.kind === 'side') {
    return sidePoint(canvasObject, endpoint);
  }
  return null;
}

function automaticEndpointPoint(
  canvasObject: PositionedCanvasObject,
  opposite: PositionedCanvasObject | undefined,
): Point {
  return opposite ? edgePointToward(canvasObject, opposite) : elementCenter(canvasObject);
}

function findPositionedCanvasObject(
  canvasObjects: PositionedCanvasObject[],
  id: string | undefined,
): PositionedCanvasObject | undefined {
  return canvasObjects.find(candidate => candidate.id === id);
}
