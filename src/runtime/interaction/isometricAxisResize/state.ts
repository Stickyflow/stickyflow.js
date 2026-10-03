import { CORNER_RADIUS_ATTR } from '../../../svg/domContract/attributes';
import {
  findAllOwnerNodes,
  findOwnerNode,
  isometricGeometryOf,
  isPrimary,
  pointerUserPoint,
  resolveOwner,
} from '../../dom';
import type { IsometricAxis } from '../../dom/selectionOverlay/isometric';
import type { OwnerRef } from '../../viewer';

export interface IsometricGeometryNodes {
  top: SVGGraphicsElement | null;
  front: SVGGraphicsElement | null;
  side: SVGGraphicsElement | null;
  hull: SVGGraphicsElement | null;
  seams: SVGGraphicsElement | null;
  groundShadow: SVGGraphicsElement | null;
  label: SVGGraphicsElement | null;
  labelGuide: SVGGraphicsElement | null;
}

export interface IsometricObjectSize {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface IsometricAxisDragState {
  owner: OwnerRef;
  axis: IsometricAxis;
  pointerId: number;
  startUser: { x: number; y: number };
  start: IsometricObjectSize;
  cornerRadius: number;
  nodes: IsometricGeometryNodes;
  moved: boolean;
  current: IsometricObjectSize;
}

function collectNodes(svg: SVGSVGElement, ownerId: string): IsometricGeometryNodes {
  const all = findAllOwnerNodes(svg, ownerId);
  const bySuffix = (suffix: string) => all.find(el => el.id.endsWith(suffix)) ?? null;
  return {
    top: bySuffix('-top'),
    front: bySuffix('-front'),
    side: bySuffix('-side'),
    hull: bySuffix('-hull'),
    seams: bySuffix('-seams'),
    groundShadow: bySuffix('-ground-shadow'),
    label: bySuffix('-label'),
    labelGuide: bySuffix('-label-guide'),
  };
}

export function createIsometricAxisDragState(svg: SVGSVGElement, event: PointerEvent): IsometricAxisDragState | null {
  const target = event.target as Element | null;
  const captureTarget = target?.closest?.('[data-sf-resize-handle]') as SVGGraphicsElement | null;
  const handleAttr = captureTarget?.getAttribute('data-sf-resize-handle');
  if (!captureTarget || !handleAttr?.startsWith('iso-')) {
    return null;
  }
  const axis = handleAttr.slice(4) as IsometricAxis;

  const overlay = captureTarget.closest('[data-sf-selection-overlay]');
  const ownerId = overlay?.getAttribute('data-sf-selection-overlay');
  if (!ownerId) {
    return null;
  }

  const primary = findOwnerNode(svg, ownerId, isPrimary);
  const owner = primary && resolveOwner(primary);
  if (!primary || owner?.role !== 'isometric') {
    return null;
  }

  const startUser = pointerUserPoint(svg, event);
  if (!startUser) {
    return null;
  }

  const geometry = isometricGeometryOf(primary);
  const bounds = geometry?.bounds ?? primary.getBBox();
  const nodes = collectNodes(svg, ownerId);
  // The live preview redraws these as sharp polygons each pointermove (see
  // preview.ts) rather than reproducing the exact rounded-corner clip -
  // dropping the clip for the duration of the drag avoids clipping the
  // live, differently-sized fill to the stale pre-drag silhouette. The
  // final render (after the committed resize) restores it.
  [nodes.top, nodes.front, nodes.side].forEach(node => {
    node?.removeAttribute('clip-path');
  });

  captureTarget.setPointerCapture?.(event.pointerId);

  const start: IsometricObjectSize = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    depth: geometry?.depth ?? 0,
  };

  return {
    owner,
    axis,
    pointerId: event.pointerId,
    startUser,
    start,
    cornerRadius: geometry?.cornerRadius ?? Number(primary.getAttribute(CORNER_RADIUS_ATTR)) ?? 0,
    nodes,
    moved: false,
    current: start,
  };
}
