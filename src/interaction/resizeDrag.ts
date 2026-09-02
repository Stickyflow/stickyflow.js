import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { ResizeSession } from './resize/session';

export { HANDLE_AXES } from './resize/geometry';

export interface ResizeDragHandle {
  destroy(): void;
}

export function bindShapeResize(viewer: Viewer, emitter: Emitter): ResizeDragHandle {
  const svg = viewer.svg;
  const session = new ResizeSession(svg, emitter);

  svg.addEventListener('pointerdown', session.pointerDown);
  svg.addEventListener('pointermove', session.pointerMove);
  svg.addEventListener('pointerup', session.pointerUp);

  return {
    destroy() {
      session.cancel();
      svg.removeEventListener('pointerdown', session.pointerDown);
      svg.removeEventListener('pointermove', session.pointerMove);
      svg.removeEventListener('pointerup', session.pointerUp);
    },
  };
}
