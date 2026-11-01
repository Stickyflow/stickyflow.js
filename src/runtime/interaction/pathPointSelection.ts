import { PATH_POINT_INDEX_ATTR, PATH_POINT_SELECTED_ATTR } from '../../svg/domContract/attributes';
import { findOwnerNode, isPrimary, type PathGeometry, pathGeometryOf, resolveOwner } from '../dom';
import type { OwnerRef } from '../viewer';

export interface SelectedPathPoints {
  owner: OwnerRef;
  indices: number[];
  geometry: PathGeometry;
}

// The points that are picked on a selected path. They live on the handles, so they are gone when the overlay is drawn again.
export function selectedPathPoints(svg: SVGSVGElement): SelectedPathPoints | null {
  const handles = [...svg.querySelectorAll(`[${PATH_POINT_SELECTED_ATTR}]`)];
  const ownerId = handles[0]?.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
  const node = ownerId ? findOwnerNode<SVGPathElement>(svg, ownerId, isPrimary) : null;
  const owner = node && resolveOwner(node);
  const geometry = node && pathGeometryOf(node);
  if (!owner || !geometry) {
    return null;
  }
  return { owner, geometry, indices: handles.map(handle => Number(handle.getAttribute(PATH_POINT_INDEX_ATTR))) };
}

export function setPointSelected(handle: Element, selected: boolean): void {
  if (selected) {
    handle.setAttribute(PATH_POINT_SELECTED_ATTR, '');
    (handle as SVGElement).style.fill = handle.getAttribute('stroke') ?? '#9b42df';
  } else {
    handle.removeAttribute(PATH_POINT_SELECTED_ATTR);
    (handle as SVGElement).style.fill = '';
  }
}

export function toEventPoints(points: Array<[number, number]>): Array<{ x: number; y: number }> {
  return points.map(([x, y]) => ({ x, y }));
}
