import { namedPortToPoint } from '../model/geometry/router';
import type { Link } from '../model/links';
import type { Point } from '../rendering/renderScene';
import { edgePointToward, elementCenter } from './edgePoint';
import type { PositionedElement } from './types';

type LinkEndpoint = NonNullable<Link['fromPoint']>;

function sidePoint(element: PositionedElement, endpoint: Extract<LinkEndpoint, { side: unknown }>): Point {
  const offset = endpoint.offset ?? 0.5;
  switch (endpoint.side) {
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

function namedPortPoint(element: PositionedElement, endpoint: Extract<LinkEndpoint, { isPort: true }>): Point {
  const port = element.symbol?.ports?.find(candidate => candidate.name === endpoint.port);
  if (!port) {
    return elementCenter(element);
  }
  return namedPortToPoint(
    {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation ?? undefined,
    },
    port.at,
  );
}

export function resolveLinkEndpoint(link: Link, end: 'from' | 'to', elements: PositionedElement[]): Point {
  const id = end === 'from' ? link.fromId : link.toId;
  const explicit = end === 'from' ? link.fromPoint : link.toPoint;
  if (explicit && 'isAbsolute' in explicit) {
    return { x: explicit.x, y: explicit.y };
  }
  const element = elements.find(candidate => candidate.id === id);
  if (!element) {
    return { x: 0, y: 0 };
  }
  if (explicit && 'isPort' in explicit) {
    return namedPortPoint(element, explicit);
  }
  if (explicit && 'side' in explicit) {
    return sidePoint(element, explicit);
  }
  const otherId = end === 'from' ? link.toId : link.fromId;
  const other = elements.find(candidate => candidate.id === otherId);
  if (!other) {
    return elementCenter(element);
  }
  return edgePointToward(element, other);
}
