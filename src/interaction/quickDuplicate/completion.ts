import type { Emitter } from '../events';
import type { QuickDuplicateDragState } from './state';

export function emitQuickDuplicateCompletion(emitter: Emitter, drag: QuickDuplicateDragState): void {
  if (!drag.moved) {
    emitter.emit('quickDuplicate', { owner: drag.sourceOwner, direction: drag.direction });
    return;
  }
  if (!drag.hit) {
    return;
  }

  emitter.emit('linkTo', {
    owner: drag.sourceOwner,
    direction: drag.direction,
    target: drag.hit.owner,
    side: drag.hit.side,
    fraction: Math.round(drag.hit.offset * 100) / 100,
  });
}
