import { PATH_INSERT_INDEX_ATTR, PATH_POINT_INDEX_ATTR } from '../../../svg/domContract/attributes';
import { findOwnerNode, isPrimary, pathGeometryOf, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';

export interface PathReshapeTarget {
  owner: OwnerRef;
  pathNode: SVGPathElement;
  handle: Element;
  pointIndex: number;
  inserted: boolean;
  points: Array<[number, number]>;
  tension: number;
  closed: boolean;
  cornerRadii: number[];
}

export function resolvePathReshapeTarget(svg: SVGSVGElement, event: PointerEvent): PathReshapeTarget | null {
  const handle =
    (event.target as Element | null)?.closest?.(`[${PATH_POINT_INDEX_ATTR}], [${PATH_INSERT_INDEX_ATTR}]`) ?? null;
  const insertAttr = handle?.getAttribute(PATH_INSERT_INDEX_ATTR) ?? null;
  const indexAttr = handle?.getAttribute(PATH_POINT_INDEX_ATTR) ?? null;
  const inserted = insertAttr !== null;
  const pointIndex = inserted ? Number(insertAttr) + 1 : indexAttr !== null ? Number(indexAttr) : Number.NaN;
  const ownerId = handle?.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
  if (!handle || !Number.isInteger(pointIndex) || !ownerId) {
    return null;
  }

  const pathNode = findOwnerNode<SVGPathElement>(svg, ownerId, isPrimary);
  const owner = pathNode && resolveOwner(pathNode);
  const geometry = pathNode && pathGeometryOf(pathNode);
  if (!pathNode || !owner || !geometry || pointIndex < 0 || pointIndex > geometry.points.length) {
    return null;
  }
  if (!inserted && pointIndex === geometry.points.length) {
    return null;
  }
  const at = (list: Array<[number, number]>, item: [number, number]) => [
    ...list.slice(0, pointIndex),
    item,
    ...list.slice(pointIndex),
  ];
  const middle: [number, number] = [Number(handle.getAttribute('cx')), Number(handle.getAttribute('cy'))];

  return {
    owner,
    pathNode,
    handle,
    pointIndex,
    inserted,
    points: inserted ? at(geometry.points, middle) : geometry.points,
    tension: geometry.tension,
    closed: geometry.closed,
    cornerRadii:
      inserted && geometry.cornerRadii.length
        ? [...geometry.cornerRadii.slice(0, pointIndex), 0, ...geometry.cornerRadii.slice(pointIndex)]
        : geometry.cornerRadii,
  };
}
