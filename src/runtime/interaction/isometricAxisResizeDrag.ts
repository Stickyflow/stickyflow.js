import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { IsometricAxisResizeSession } from './isometricAxisResize/session';

export interface IsometricAxisResizeDragHandle {
  destroy(): void;
}

export function bindIsometricAxisResize(viewer: Viewer, emitter: Emitter): IsometricAxisResizeDragHandle {
  const svg = viewer.svg;
  const session = new IsometricAxisResizeSession(svg, emitter);

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
