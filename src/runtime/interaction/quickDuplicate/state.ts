import { pointAtPort } from '../../../model/geometry/ports';
import type { Rect, Side } from '../../../model/geometry/types';
import type { QuickDuplicateDirection } from '../../dom';
import { findOwnerNode, isPrimary, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { LinkGhost } from '../linkGhost/ghost';

export interface DuplicateCandidate {
  owner: OwnerRef;
  bounds: Rect;
}

export interface QuickDuplicateDragState {
  sourceOwner: OwnerRef;
  direction: QuickDuplicateDirection;
  fixedPoint: { x: number; y: number };
  previewPath: SVGPathElement;
  ghost: LinkGhost;
  candidates: DuplicateCandidate[];
  pointerId: number;
  startScreen: { x: number; y: number };
  moved: boolean;
  hit: { owner: OwnerRef; side: Side; offset: number } | null;
}

function duplicateCandidates(svg: SVGSVGElement, sourceId: string): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];
  for (const element of svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary]')) {
    if (element.getAttribute('data-sf-role') === 'link') {
      continue;
    }
    const owner = resolveOwner(element);
    if (owner && owner.id !== sourceId) {
      candidates.push({ owner, bounds: element.getBBox() });
    }
  }
  return candidates;
}

export function createQuickDuplicateDragState(
  svg: SVGSVGElement,
  event: PointerEvent,
  previewPath: SVGPathElement,
): QuickDuplicateDragState | null {
  const bubble = (event.target as Element | null)?.closest('[data-sf-quick-duplicate]');
  const direction = bubble?.getAttribute('data-sf-quick-duplicate') as QuickDuplicateDirection | null;
  const sourceId = bubble?.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
  if (!bubble || !direction || !sourceId) {
    return null;
  }

  const primary = findOwnerNode(svg, sourceId, isPrimary);
  const sourceOwner = primary && resolveOwner(primary);
  if (!primary || !sourceOwner) {
    return null;
  }

  (event.target as Element).setPointerCapture?.(event.pointerId);
  return {
    sourceOwner,
    direction,
    fixedPoint: pointAtPort(primary.getBBox(), { side: direction, offset: 0.5 }),
    previewPath,
    ghost: new LinkGhost(svg, previewPath),
    candidates: duplicateCandidates(svg, sourceId),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    moved: false,
    hit: null,
  };
}
