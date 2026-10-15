import { isCameraGesture, resolveOwner } from '../../dom';
import type { Viewer } from '../../viewer';
import type { Emitter, IsometricQuickDuplicateDirection } from '../events';

function isIsometricDirection(value: string): value is IsometricQuickDuplicateDirection {
  return value.startsWith('iso-');
}

export interface IsometricQuickDuplicateHandle {
  destroy(): void;
}

export function bindIsometricQuickDuplicate(viewer: Viewer, emitter: Emitter): IsometricQuickDuplicateHandle {
  const svg = viewer.svg;

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || isCameraGesture(event)) {
      return;
    }
    const bubble = (event.target as Element | null)?.closest('[data-sf-quick-duplicate]');
    const direction = bubble?.getAttribute('data-sf-quick-duplicate');
    if (!bubble || !direction || !isIsometricDirection(direction)) {
      return;
    }
    const overlay = bubble.closest('[data-sf-selection-overlay]');
    const sourceId = overlay?.getAttribute('data-sf-selection-overlay');
    const primary = sourceId
      ? svg.querySelector(`[data-sf-id="${CSS.escape(sourceId)}"][data-sf-primary="true"]`)
      : null;
    const owner = primary && resolveOwner(primary);
    if (!owner) {
      return;
    }
    event.stopPropagation();
    emitter.emit('quickDuplicate', { owner, direction });
  };

  svg.addEventListener('pointerdown', onPointerDown);
  return {
    destroy() {
      svg.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
