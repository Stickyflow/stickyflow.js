import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import { PieSliceDragSession } from './session';

export interface PieSliceDragHandle {
  destroy(): void;
}

export function bindPieSliceDrag(viewer: Viewer, emitter: Emitter): PieSliceDragHandle {
  const session = new PieSliceDragSession(viewer.svg, emitter);
  const onPointerDown = (event: PointerEvent) => {
    if (session.start(event)) {
      event.stopPropagation();
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    session.move(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    session.finish(event);
  };
  viewer.svg.addEventListener('pointerdown', onPointerDown);
  viewer.svg.addEventListener('pointermove', onPointerMove);
  viewer.svg.addEventListener('pointerup', onPointerUp);
  viewer.svg.addEventListener('pointercancel', onPointerUp);
  return {
    destroy() {
      session.cancel();
      viewer.svg.removeEventListener('pointerdown', onPointerDown);
      viewer.svg.removeEventListener('pointermove', onPointerMove);
      viewer.svg.removeEventListener('pointerup', onPointerUp);
      viewer.svg.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
