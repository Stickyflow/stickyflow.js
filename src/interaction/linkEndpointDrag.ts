import type { Viewer } from '../viewer';
import { isCameraGesture } from '../viewer/contract';
import type { Emitter } from './events';
import { updateEndpointPreview } from './linkEndpoint/preview';
import { createLinkEndpointDragState, type LinkEndpointDragState } from './linkEndpoint/state';
import { resolveEndpointTarget } from './linkEndpoint/target';

export { nearestPort, sideFromDirection } from './linkEndpoint/geometry';

export interface LinkEndpointDragHandle {
  destroy(): void;
}

const SCREEN_DRAG_THRESHOLD = 3;

function pointerPosition(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return { x: 0, y: 0 };
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  return { x: point.x, y: point.y };
}

function crossedDragThreshold(drag: LinkEndpointDragState, event: PointerEvent): boolean {
  return Math.hypot(event.clientX - drag.startScreen.x, event.clientY - drag.startScreen.y) >= SCREEN_DRAG_THRESHOLD;
}

export function bindLinkEndpointDrag(viewer: Viewer, emitter: Emitter): LinkEndpointDragHandle {
  const svg = viewer.svg;
  let drag: LinkEndpointDragState | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || drag || isCameraGesture(event)) {
      return;
    }
    drag = createLinkEndpointDragState(svg, event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && !crossedDragThreshold(drag, event)) {
      return;
    }

    drag.moved = true;
    const target = resolveEndpointTarget(drag, pointerPosition(svg, event));
    updateEndpointPreview(drag, target.point, target.side);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const completed = drag;
    drag = null;
    (event.target as Element).releasePointerCapture?.(completed.pointerId);
    if (!completed.moved) {
      return;
    }
    if (!completed.hit) {
      completed.path.setAttribute('d', completed.originalD);
      return;
    }

    emitter.emit('linkReconnect', {
      owner: completed.linkOwner,
      end: completed.end,
      target: completed.hit.owner,
      side: completed.hit.side,
      fraction: Math.round(completed.hit.offset * 100) / 100,
    });
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);

  return {
    destroy() {
      drag = null;
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
    },
  };
}
