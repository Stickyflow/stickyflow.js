import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { type PathDrawOptions, PathDrawSession } from './pathDraw/session';

export type { PathDrawOptions } from './pathDraw/session';

export interface PathDrawDragHandle {
  start(options?: PathDrawOptions): void;
  cancel(): void;
  destroy(): void;
}

export function bindPathDraw(viewer: Viewer, emitter: Emitter): PathDrawDragHandle {
  const svg = viewer.svg;
  const session = new PathDrawSession(svg, emitter);

  svg.addEventListener('pointerdown', session.pointerDown, true);
  svg.addEventListener('pointermove', session.pointerMove, true);
  svg.addEventListener('pointerup', session.pointerUp, true);
  svg.addEventListener('dblclick', session.dblClick, true);
  window.addEventListener('keydown', session.keyDown);
  window.addEventListener('keyup', session.keyUp);

  return {
    start: options => session.start(options),
    cancel: () => session.cancel(),
    destroy() {
      session.cancel();
      svg.removeEventListener('pointerdown', session.pointerDown, true);
      svg.removeEventListener('pointermove', session.pointerMove, true);
      svg.removeEventListener('pointerup', session.pointerUp, true);
      svg.removeEventListener('dblclick', session.dblClick, true);
      window.removeEventListener('keydown', session.keyDown);
      window.removeEventListener('keyup', session.keyUp);
    },
  };
}
