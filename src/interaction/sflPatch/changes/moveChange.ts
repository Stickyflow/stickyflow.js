import { sflToCanvasState } from '../../../sfl';
import type { MoveChangeEvent } from '../../events';
import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  const state = sflToCanvasState(sfl);
  const entity = state.entities.find(candidate => candidate.id === event.owner.id);
  if (!entity) {
    return sfl;
  }
  // `entity.x`/`entity.y` are absolute canvas coordinates (the parent chain's
  // origin already folded in — see entityGeometry.ts), but `layout.position`
  // is an offset from the immediate parent's own origin, not an absolute
  // coordinate. Writing the absolute value straight back for a child nested
  // in a container that itself sits away from (0, 0) double-counts that
  // container's own offset on the next render. Subtracting the parent's
  // absolute origin converts back to the coordinate space `position` is
  // actually in; a top-level entity has no parent, so this is a no-op there.
  const parent = entity.parentFrameId
    ? state.entities.find(candidate => candidate.id === entity.parentFrameId)
    : undefined;
  const originX = parent?.x ?? 0;
  const originY = parent?.y ?? 0;
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setOrInsertLayoutTuples(lines, range, [['position', entity.x - originX + event.dx, entity.y - originY + event.dy]]);
  return lines.join('\n');
}
