import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { ResizeChangeEvent } from '../../events';
import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyResizeChange(sfl: string, event: ResizeChangeEvent): string {
  // event.x/event.y are absolute canvas coordinates (see moveChange.ts for
  // why), same conversion needed for a resize target nested in a container
  // that isn't itself at the canvas origin.
  const state = sflToCanvasState(sfl);
  const canvasObject = state.canvasObjects.find(candidate => candidate.id === event.owner.id);
  const parent = canvasObject?.parentFrameId
    ? state.canvasObjects.find(candidate => candidate.id === canvasObject.parentFrameId)
    : undefined;
  const originX = parent?.x ?? 0;
  const originY = parent?.y ?? 0;

  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setOrInsertLayoutTuples(lines, range, [
    ['position', event.x - originX, event.y - originY],
    ['size', event.width, event.height],
  ]);
  return lines.join('\n');
}
