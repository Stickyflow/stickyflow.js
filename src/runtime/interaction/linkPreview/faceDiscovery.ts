import { type IsometricFace, isometricFaceCenter } from '../../../model/isometricObject';
import { findOwnerNode, isometricGeometryOf, isPrimary } from '../../dom';
import type { LiveFaceLink } from './types';

type IsometricObjectSize = Parameters<typeof isometricFaceCenter>[0];

function resolveOtherFacePoint(
  svg: SVGSVGElement,
  path: SVGPathElement,
  canvasObjectId: string,
): { otherPoint: ReturnType<typeof isometricFaceCenter>; draggedIsFrom: boolean; face: IsometricFace } | null {
  const draggedIsFrom = path.getAttribute('data-sf-from') === canvasObjectId;
  const otherId = path.getAttribute(draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
  const face = path.getAttribute(draggedIsFrom ? 'data-sf-from-face' : 'data-sf-to-face') as IsometricFace | null;
  const otherFace = path.getAttribute(draggedIsFrom ? 'data-sf-to-face' : 'data-sf-from-face') as IsometricFace | null;
  if (!otherId || !face || !otherFace) {
    return null;
  }
  const otherPrimary = findOwnerNode(svg, otherId, isPrimary);
  const otherGeometry = otherPrimary && isometricGeometryOf(otherPrimary);
  if (!otherGeometry?.bounds) {
    return null;
  }
  const otherObject: IsometricObjectSize = {
    x: otherGeometry.bounds.x,
    y: otherGeometry.bounds.y,
    width: otherGeometry.width,
    height: otherGeometry.height,
    depth: otherGeometry.depth,
  };
  return { otherPoint: isometricFaceCenter(otherObject, otherFace), draggedIsFrom, face };
}

export function findLiveFaceLinks(svg: SVGSVGElement, canvasObjectId: string): LiveFaceLink[] {
  const escapedId = CSS.escape(canvasObjectId);
  const candidates = svg.querySelectorAll<SVGPathElement>(
    `path[data-sf-kind="connection"][data-sf-from="${escapedId}"], path[data-sf-kind="connection"][data-sf-to="${escapedId}"]`,
  );
  const links: LiveFaceLink[] = [];
  for (const path of candidates) {
    const resolved = resolveOtherFacePoint(svg, path, canvasObjectId);
    if (resolved) {
      links.push({ path, ...resolved });
    }
  }
  return links;
}
