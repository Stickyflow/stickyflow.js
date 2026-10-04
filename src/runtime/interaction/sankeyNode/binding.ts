import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import type { ActiveTextEditor } from '../textEdit/activeEditor';
import { createSankeyNodeLabelEditor, resolveSankeyNodeLabelTarget } from './rename';
import { SankeyNodeDragSession } from './session';

export interface SankeyNodeHandle {
  destroy(): void;
}

export function bindSankeyNode(viewer: Viewer, emitter: Emitter): SankeyNodeHandle {
  const svg = viewer.svg;
  const drag = new SankeyNodeDragSession(svg, emitter);
  let activeEditor: ActiveTextEditor | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (drag.start(event)) {
      event.stopPropagation();
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    drag.move(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    drag.finish(event);
  };
  const onDoubleClick = (event: MouseEvent) => {
    const target = resolveSankeyNodeLabelTarget(event);
    if (!target) {
      return;
    }
    activeEditor?.cancel();
    activeEditor = createSankeyNodeLabelEditor(target, emitter, () => {
      activeEditor = null;
    });
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  svg.addEventListener('dblclick', onDoubleClick);

  return {
    destroy() {
      drag.cancel();
      activeEditor?.cancel();
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.removeEventListener('dblclick', onDoubleClick);
    },
  };
}
