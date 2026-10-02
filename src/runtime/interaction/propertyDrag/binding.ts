import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { PropertyDragSession } from './session';

export interface PropertyDragHandle {
  destroy(): void;
}

export function bindPropertyDrag(
  viewer: Viewer,
  emitter: Emitter,
  rules: EditableRules | undefined,
): PropertyDragHandle {
  const svg = viewer.svg;
  const session = new PropertyDragSession(svg, emitter, rules);

  const onPointerDown = (event: PointerEvent) => {
    if (session.start(event)) {
      event.stopPropagation();
    }
  };
  const onPointerMove = (event: PointerEvent) => session.move(event);
  const onPointerUp = (event: PointerEvent) => session.finish(event);

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      session.cancel();
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
