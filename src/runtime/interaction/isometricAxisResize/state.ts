import { CORNER_RADIUS_ATTR } from '../../../svg/domContract/attributes';
import {
  findAllOwnerNodes,
  findOwnerNode,
  ISO_DUPLICATE_BUBBLES_ATTR,
  ISO_HALO_ATTR,
  isometricGeometryOf,
  isPrimary,
  pointerUserPoint,
  resolveOwner,
} from '../../dom';
import type { IsometricAxis } from '../../dom/selectionOverlay/isometric';
import type { OwnerRef } from '../../viewer';
import { findLiveFaceLinks, type LiveFaceLink } from '../linkPreview';

const AXES: readonly IsometricAxis[] = ['width', 'height', 'depth'];

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
  overlayHalo: SVGPathElement | null;
  overlayArrows: Record<IsometricAxis, SVGGElement | null>;
  overlayDuplicateBubbles: SVGGElement | null;
  liveFaceLinks: LiveFaceLink[];
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

interface ResizeHandle {
  captureTarget: SVGGraphicsElement;
  axis: IsometricAxis;
  overlay: Element;
  ownerId: string;
}

// The arrow of the selection overlay that the pointer went down on, with the axis it stands for and the object the overlay belongs to.
function findResizeHandle(event: PointerEvent): ResizeHandle | null {
  const target = event.target as Element | null;
  const captureTarget = target?.closest?.('[data-sf-resize-handle]') as SVGGraphicsElement | null;
  const handleAttr = captureTarget?.getAttribute('data-sf-resize-handle');
  if (!captureTarget || !handleAttr?.startsWith('iso-')) {
    return null;
  }
  const overlay = captureTarget.closest('[data-sf-selection-overlay]');
  const ownerId = overlay?.getAttribute('data-sf-selection-overlay');
  if (!overlay || !ownerId) {
    return null;
  }
  return { captureTarget, axis: handleAttr.slice(4) as IsometricAxis, overlay, ownerId };
}

// The parts of the overlay that follow the drag. The bubbles that duplicate the object are hidden while it is dragged.
function overlayPartsOf(
  overlay: Element,
): Pick<IsometricAxisDragState, 'overlayHalo' | 'overlayArrows' | 'overlayDuplicateBubbles'> {
  const overlayHalo = (overlay.querySelector(`[${ISO_HALO_ATTR}]`) as SVGPathElement | null) ?? null;
  const overlayArrows = Object.fromEntries(
    AXES.map(axis => [
      axis,
      (overlay.querySelector(`[data-sf-resize-handle="iso-${axis}"]`) as SVGGElement | null) ?? null,
    ]),
  ) as Record<IsometricAxis, SVGGElement | null>;
  const overlayDuplicateBubbles =
    (overlay.querySelector(`[${ISO_DUPLICATE_BUBBLES_ATTR}]`) as SVGGElement | null) ?? null;
  if (overlayDuplicateBubbles) {
    overlayDuplicateBubbles.style.display = 'none';
  }
  return { overlayHalo, overlayArrows, overlayDuplicateBubbles };
}

export function createIsometricAxisDragState(svg: SVGSVGElement, event: PointerEvent): IsometricAxisDragState | null {
  const handle = findResizeHandle(event);
  if (!handle) {
    return null;
  }
  const { captureTarget, axis, overlay, ownerId } = handle;

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
  [nodes.top, nodes.front, nodes.side].forEach(node => {
    node?.removeAttribute('clip-path');
  });

  captureTarget.setPointerCapture?.(event.pointerId);

  const start: IsometricObjectSize = {
    x: bounds.x,
    y: bounds.y,
    width: geometry?.width ?? bounds.width,
    height: geometry?.height ?? bounds.height,
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
    ...overlayPartsOf(overlay),
    liveFaceLinks: findLiveFaceLinks(svg, ownerId),
    moved: false,
    current: start,
  };
}
