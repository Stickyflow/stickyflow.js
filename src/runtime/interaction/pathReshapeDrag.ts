import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { PathReshapeSession } from './pathReshape/session';

export interface PathReshapeDragHandle {
  destroy(): void;
}

export function bindPathReshape(viewer: Viewer, emitter: Emitter): PathReshapeDragHandle {
  const svg = viewer.svg;
  const session = new PathReshapeSession(svg, emitter);

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
