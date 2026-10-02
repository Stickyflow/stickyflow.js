import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { LinkEndpointSession } from './linkEndpoint/session';

export { nearestPort, sideFromDirection } from './linkEndpoint/geometry';

export interface LinkEndpointDragHandle {
  destroy(): void;
}

export function bindLinkEndpointDrag(viewer: Viewer, emitter: Emitter): LinkEndpointDragHandle {
  const svg = viewer.svg;
  const session = new LinkEndpointSession(svg, emitter);

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
