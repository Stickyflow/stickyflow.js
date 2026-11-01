import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { selectedPathPoints, toEventPoints } from './pathPointSelection';

export interface DeleteSelectionHandle {
  destroy(): void;
}

export function bindDeleteSelection(viewer: Viewer, emitter: Emitter): DeleteSelectionHandle {
  const svg = viewer.svg;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
      return;
    }
    const picked = selectedPathPoints(svg);
    if (picked) {
      const { owner, geometry, indices } = picked;
      const keep = geometry.points.map((_, index) => index).filter(index => !indices.includes(index));
      if (keep.length >= (geometry.closed ? 3 : 2)) {
        e.preventDefault();
        emitter.emit('pathPointChange', {
          owner,
          points: toEventPoints(keep.map(index => geometry.points[index])),
          ...(geometry.cornerRadii.length ? { cornerRadii: keep.map(index => geometry.cornerRadii[index] ?? 0) } : {}),
        });
        return;
      }
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
