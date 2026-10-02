import { type LinkTarget, resolveLinkTarget } from '../linkGhost/target';
import type { QuickDuplicateDragState } from './state';

export function resolveDuplicateTarget(
  drag: QuickDuplicateDragState,
  point: { x: number; y: number },
  unitsPerPx: number,
): LinkTarget {
  const target = resolveLinkTarget(drag.candidates, drag.fixedPoint, point, unitsPerPx);
  drag.hit = target.hit;
  return target;
}
