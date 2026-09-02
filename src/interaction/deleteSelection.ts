import type { Viewer } from '../viewer';
import type { Emitter } from './events';

export interface DeleteSelectionHandle {
  destroy(): void;
}

export function bindDeleteSelection(viewer: Viewer, emitter: Emitter): DeleteSelectionHandle {
  const svg = viewer.svg;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
      return;
    }
    const owners = viewer.getSelection();
    if (!owners.length) {
      return;
    }
    e.preventDefault();
    emitter.emit('delete', { owners });
  };

  svg.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      svg.removeEventListener('keydown', onKeyDown);
    },
  };
}
