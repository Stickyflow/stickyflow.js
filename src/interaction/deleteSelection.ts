// Backspace/Delete removes whatever is currently selected. (DOM code —
// browser-verified, like the other interaction/*.ts modules.)
//
// Bound on the viewer's own svg element, the same way viewer/interaction.ts's
// own Escape-clears-selection handler is: a keydown listener only fires when
// the listening element (or a focused descendant) has actual DOM focus, and
// clicking a selectable owner already focuses it (every owner node gets
// tabindex="0" per the DOM contract) — so this never fires while focus is
// somewhere else on the page, e.g. a host's own chat input, without needing
// to special-case that here at all.
import type { Viewer } from '../viewer';
import { Emitter } from './events';

export interface DeleteSelectionHandle {
  destroy(): void;
}

export function bindDeleteSelection(viewer: Viewer, emitter: Emitter): DeleteSelectionHandle {
  const svg = viewer.svg;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const owners = viewer.getSelection();
    if (!owners.length) return;
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
