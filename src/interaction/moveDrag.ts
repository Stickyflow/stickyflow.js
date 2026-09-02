import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { MoveSession } from './move/session';

export interface MoveDragHandle {
  destroy(): void;
}

export function bindShapeMovement(viewer: Viewer, emitter: Emitter): MoveDragHandle {
  const svg = viewer.svg;
  const session = new MoveSession(viewer, emitter);

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
