import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { LinkSegmentSession } from './linkSegment/session';

export interface LinkSegmentDragHandle {
  destroy(): void;
}

export function bindLinkSegmentDrag(viewer: Viewer, emitter: Emitter): LinkSegmentDragHandle {
  const svg = viewer.svg;
  const session = new LinkSegmentSession(svg, emitter);

  svg.addEventListener('pointerdown', session.pointerDown);
  svg.addEventListener('pointermove', session.pointerMove);
  svg.addEventListener('pointerup', session.pointerUp);
  svg.addEventListener('dblclick', session.doubleClick);

  return {
    destroy() {
      session.cancel();
      svg.removeEventListener('pointerdown', session.pointerDown);
      svg.removeEventListener('pointermove', session.pointerMove);
      svg.removeEventListener('pointerup', session.pointerUp);
      svg.removeEventListener('dblclick', session.doubleClick);
    },
  };
}
