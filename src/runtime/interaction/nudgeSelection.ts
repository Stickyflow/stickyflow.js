import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { hasMovableGeometry } from './geometryRoles';

export interface NudgeSelectionHandle {
  destroy(): void;
}

const STEP = 1;
const SHIFT_STEP = 10;

const DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

function typingInField(event: KeyboardEvent): boolean {
  return event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]') !== null;
}

export function bindNudgeSelection(viewer: Viewer, emitter: Emitter): NudgeSelectionHandle {
  const svg = viewer.svg;

  const onKeyDown = (e: KeyboardEvent) => {
    const direction = DIRECTIONS[e.key];
    if (!direction || e.altKey || e.ctrlKey || e.metaKey || typingInField(e)) {
      return;
    }
    const owners = viewer.getSelection().filter(hasMovableGeometry);
    if (!owners.length) {
      return;
    }
    e.preventDefault();
    const step = e.shiftKey ? SHIFT_STEP : STEP;
    for (const owner of owners) {
      emitter.emit('moveChange', { owner, dx: direction.x * step, dy: direction.y * step });
    }
  };

  svg.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      svg.removeEventListener('keydown', onKeyDown);
    },
  };
}
