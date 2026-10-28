import { PATH_POINT_INDEX_ATTR } from '../../../svg/domContract/attributes';
import { findOwnerNode, isPrimary, pathGeometryOf, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';

export interface PathReshapeTarget {
  owner: OwnerRef;
  pathNode: SVGPathElement;
  handle: Element;
  pointIndex: number;
  points: Array<[number, number]>;
  tension: number;
  closed: boolean;
}

export function resolvePathReshapeTarget(svg: SVGSVGElement, event: PointerEvent): PathReshapeTarget | null {
  const handle = (event.target as Element | null)?.closest?.(`[${PATH_POINT_INDEX_ATTR}]`) ?? null;
  const indexAttr = handle?.getAttribute(PATH_POINT_INDEX_ATTR) ?? null;
  const pointIndex = indexAttr !== null ? Number(indexAttr) : Number.NaN;
  const ownerId = handle?.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
  if (!handle || !Number.isInteger(pointIndex) || !ownerId) {
    return null;
  }

  const pathNode = findOwnerNode<SVGPathElement>(svg, ownerId, isPrimary);
  const owner = pathNode && resolveOwner(pathNode);
  const geometry = pathNode && pathGeometryOf(pathNode);
  if (!pathNode || !owner || !geometry || pointIndex < 0 || pointIndex >= geometry.points.length) {
    return null;
  }

  return {
    owner,
    pathNode,
    handle,
    pointIndex,
    points: geometry.points,
    tension: geometry.tension,
    closed: geometry.closed,
  };
}
