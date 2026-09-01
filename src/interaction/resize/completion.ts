import type { Rect } from '../../model/geometry/router';
import type { Emitter } from '../events';
import type { ResizeDragState } from './state';

export function emitResizeCompletion(emitter: Emitter, drag: ResizeDragState, bounds: Rect): void {
  if (!drag.moved) {
    return;
  }

  emitter.emit('resizeChange', {
    owner: drag.owner,
    dx: bounds.x - drag.startBounds.x,
    dy: bounds.y - drag.startBounds.y,
    dWidth: bounds.width - drag.startBounds.width,
    dHeight: bounds.height - drag.startBounds.height,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}
