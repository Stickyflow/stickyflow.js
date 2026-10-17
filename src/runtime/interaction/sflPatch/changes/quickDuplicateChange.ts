import { isIsometricObject } from '../../../../sflSemantic/canvasObjects/artifacts/isometric/types';
import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { QuickDuplicateEvent } from '../../events';
import { duplicateIsometricObject, isIsometricDirection } from './quickDuplicate/isometricDuplicate';
import { duplicateShape } from './quickDuplicate/shapeDuplicate';
import type { QuickDuplicateOptions } from './quickDuplicate/types';

export type { QuickDuplicateOptions } from './quickDuplicate/types';

// Carries out a quick duplicate: a copy of the object with its look beyond the dragged edge, and a link or connection
// to it. A direction that does not fit the kind of object changes nothing.
export function applyQuickDuplicateChange(
  sfl: string,
  event: QuickDuplicateEvent,
  options: QuickDuplicateOptions,
): string {
  const state = sflToCanvasState(sfl);
  const object = state.canvasObjects.find(candidate => candidate.id === event.owner.id);
  if (!object) {
    return sfl;
  }
  const { direction } = event;
  if (isIsometricDirection(direction)) {
    return isIsometricObject(object) ? duplicateIsometricObject(sfl, object, direction, options) : sfl;
  }
  return isIsometricObject(object)
    ? sfl
    : duplicateShape(sfl, { object, links: state.links, side: direction, options });
}
