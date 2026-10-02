import type { Viewer } from '../viewer';
import { ColumnResizeSession } from './columnResize/session';
import type { Emitter } from './events';

export interface ColumnResizeDragHandle {
  destroy(): void;
}

export function bindColumnResize(viewer: Viewer, emitter: Emitter): ColumnResizeDragHandle {
  const svg = viewer.svg;
  const session = new ColumnResizeSession(svg, emitter);

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
