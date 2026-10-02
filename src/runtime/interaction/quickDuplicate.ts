import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { QuickDuplicateSession } from './quickDuplicate/session';

export interface QuickDuplicateHandle {
  destroy(): void;
}

export function bindQuickDuplicate(viewer: Viewer, emitter: Emitter): QuickDuplicateHandle {
  const svg = viewer.svg;
  const session = new QuickDuplicateSession(svg, emitter);

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
