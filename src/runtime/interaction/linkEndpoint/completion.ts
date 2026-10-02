import type { Emitter } from '../events';
import type { LinkEndpointDragState } from './state';

export function completeLinkEndpointDrag(emitter: Emitter, drag: LinkEndpointDragState): void {
  if (!drag.moved) {
    return;
  }
  if (!drag.hit) {
    drag.path.setAttribute('d', drag.originalD);
    return;
  }

  emitter.emit('linkReconnect', {
    owner: drag.linkOwner,
    end: drag.end,
    target: drag.hit.owner,
    side: drag.hit.side,
    fraction: Math.round(drag.hit.offset * 100) / 100,
  });
}
