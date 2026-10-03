import { AXIS_COS, AXIS_SIN } from '../../../model/isometricObject';
import { isCameraGesture, isometricGeometryOf, pointerUserPoint, resolveOwner } from '../../dom';
import type { IsometricLabelDragState } from './types';

function findLabelMark(event: PointerEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.(
    '[id$="-label"], [id$="-label-background"]',
  ) as SVGGraphicsElement | null;
}

function isLabelPointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

function findHull(svg: SVGSVGElement, ownerId: string): SVGGraphicsElement | null {
  return svg.querySelector<SVGGraphicsElement>(`[data-sf-id="${CSS.escape(ownerId)}"][data-sf-primary="true"]`);
}

function findBySuffix(svg: SVGSVGElement, suffix: string): SVGGraphicsElement | null {
  return svg.querySelector<SVGGraphicsElement>(`[id$="${CSS.escape(suffix)}"]`);
}

export function resolveIsometricLabelDrag(svg: SVGSVGElement, event: PointerEvent): IsometricLabelDragState | null {
  if (!isLabelPointer(event)) {
    return null;
  }
  const clicked = findLabelMark(event);
  if (!clicked) {
    return null;
  }
  const owner = resolveOwner(clicked);
  if (owner?.role !== 'isometric') {
    return null;
  }
  const hull = findHull(svg, owner.id);
  const geometry = hull ? isometricGeometryOf(hull) : null;
  if (!geometry?.bounds) {
    return null;
  }
  const start = pointerUserPoint(svg, event);
  if (!start) {
    return null;
  }
  // Top-face centroid, matching isometricTopFaceCenter exactly (box.width
  // is (width+depth)*AXIS_COS, so box.width*(AXIS_SIN/AXIS_COS)/2 recovers
  // (width+depth)*AXIS_SIN/2) - dropping the /2 here previously landed on
  // the "center" vertex (where top/front/side meet) instead, snapping the
  // guide line's start point there for the live drag and only correcting
  // back to the true centroid once the renderer took over on release.
  const anchorX = geometry.bounds.x + geometry.bounds.width / 2;
  const anchorY = geometry.bounds.y + (geometry.bounds.width * (AXIS_SIN / AXIS_COS)) / 2;
  const text = findBySuffix(svg, `-${owner.id}-label`);
  if (!text) {
    return null;
  }
  const background = findBySuffix(svg, `-${owner.id}-label-background`);
  const guideElement = findBySuffix(svg, `-${owner.id}-label-guide`);
  const box = text.getBBox();
  const restX = box.x + box.width / 2;
  const restY = box.y + box.height;
  clicked.setPointerCapture?.(event.pointerId);
  return {
    owner,
    pointerId: event.pointerId,
    anchorX,
    anchorY,
    restX,
    restY,
    startX: start.x,
    startY: start.y,
    baseOffsetX: geometry.labelOffsetX,
    baseOffsetY: geometry.labelOffsetY,
    moved: false,
    lastDx: 0,
    lastDy: 0,
    labelElements: background ? [text, background] : [text],
    guideElement,
    guideOriginalD: guideElement?.getAttribute('d') ?? null,
  };
}
