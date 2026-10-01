import { edgePointToward, elementCenter } from '../../model/geometry/rectangle';
import { namedPortToPoint } from '../../model/geometry/routing';
import type { Point } from '../../model/geometry/types';
import type { Link } from '../../model/link';
import type { PositionedElement } from './types';

type LinkEndpoint = NonNullable<Link['fromPoint']>;
type LinkEnd = 'from' | 'to';

interface SelectedLinkEndpoint {
  elementId: string | undefined;
  oppositeElementId: string | undefined;
  explicit: LinkEndpoint | undefined;
}

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

function namedPortPoint(element: PositionedElement, endpoint: Extract<LinkEndpoint, { kind: 'port' }>): Point {
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

export function resolveLinkEndpoint(link: Link, end: LinkEnd, elements: PositionedElement[]): Point {
  const selected = selectLinkEndpoint(link, end);
  const absolutePoint = explicitAbsolutePoint(selected.explicit);
  if (absolutePoint) {
    return absolutePoint;
  }
  const element = findPositionedElement(elements, selected.elementId);
  if (!element) {
    return { x: 0, y: 0 };
  }
  const anchoredPoint = explicitAnchorPoint(element, selected.explicit);
  if (anchoredPoint) {
    return anchoredPoint;
  }
  return automaticEndpointPoint(element, findPositionedElement(elements, selected.oppositeElementId));
}

function selectLinkEndpoint(link: Link, end: LinkEnd): SelectedLinkEndpoint {
  return end === 'from'
    ? { elementId: link.fromId, oppositeElementId: link.toId, explicit: link.fromPoint }
    : { elementId: link.toId, oppositeElementId: link.fromId, explicit: link.toPoint };
}

function explicitAbsolutePoint(endpoint: LinkEndpoint | undefined): Point | null {
  return endpoint?.kind === 'absolute' ? { x: endpoint.x, y: endpoint.y } : null;
}

function explicitAnchorPoint(element: PositionedElement, endpoint: LinkEndpoint | undefined): Point | null {
  if (endpoint?.kind === 'port') {
    return namedPortPoint(element, endpoint);
  }
  if (endpoint?.kind === 'side') {
    return sidePoint(element, endpoint);
  }
  return null;
}

function automaticEndpointPoint(element: PositionedElement, opposite: PositionedElement | undefined): Point {
  return opposite ? edgePointToward(element, opposite) : elementCenter(element);
}

function findPositionedElement(elements: PositionedElement[], id: string | undefined): PositionedElement | undefined {
  return elements.find(candidate => candidate.id === id);
}
