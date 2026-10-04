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

  const overlayHalo = (overlay?.querySelector(`[${ISO_HALO_ATTR}]`) as SVGPathElement | null) ?? null;
  const overlayArrows = Object.fromEntries(
    AXES.map(axis => [
      axis,
      (overlay?.querySelector(`[data-sf-resize-handle="iso-${axis}"]`) as SVGGElement | null) ?? null,
    ]),
  ) as Record<IsometricAxis, SVGGElement | null>;
  // Hidden for the duration of the drag instead of kept live-positioned -
  // they'd otherwise sit stale (wrong face centers) until the drag ends,
  // and they're not meaningful to click mid-drag anyway.
  const overlayDuplicateBubbles =
    (overlay?.querySelector(`[${ISO_DUPLICATE_BUBBLES_ATTR}]`) as SVGGElement | null) ?? null;
  if (overlayDuplicateBubbles) {
    overlayDuplicateBubbles.style.display = 'none';
  }

  // bounds (declaredBounds) is the on-screen box - only x/y double as the
  // true object position (they're identical by construction, see
  // isometricBounds). width/height/depth must come from the true-size
  // attribute instead: the box's width/height are DERIVED from them, not
  // interchangeable with them.
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
    overlayHalo,
    overlayArrows,
    overlayDuplicateBubbles,
    liveFaceLinks: findLiveFaceLinks(svg, ownerId),
    moved: false,
    current: start,
  };
}
