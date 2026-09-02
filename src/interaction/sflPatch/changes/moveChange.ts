import { sflToCanvasState } from '../../../sfl';
import type { MoveChangeEvent } from '../../events';
import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  const entity = sflToCanvasState(sfl).entities.find(candidate => candidate.id === event.owner.id);
  if (!entity) {
    return sfl;
  }
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setOrInsertLayoutTuples(lines, range, [['position', entity.x + event.dx, entity.y + event.dy]]);
  return lines.join('\n');
}
