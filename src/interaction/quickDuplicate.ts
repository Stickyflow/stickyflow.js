// Click handling for the four quick-duplicate bubbles viewer/selectionOverlay.ts
// draws around a singly-selected entity. (DOM code — browser-verified, like
// moveDrag.ts/resizeDrag.ts/linkEndpointDrag.ts.)
//
// Deliberately just a click, no drag-vs-click timing window: unlike the
// interactive canvas app's version, there's no "drag the bubble onto an
// existing entity to link them without duplicating" gesture here — only
// duplicate-and-link. A plain 'click' (fires after pointerup, so it never
// races viewer/interaction.ts's own pointer handling on the same svg) is all
// that's needed.
import type { Viewer } from '../viewer';
import { resolveOwner } from '../viewer/contract';
import { findOwnerNode, isPrimary } from '../viewer/domQuery';
import { Emitter } from './events';

export interface QuickDuplicateHandle {
  destroy(): void;
}

export function bindQuickDuplicate(viewer: Viewer, emitter: Emitter): QuickDuplicateHandle {
  const svg = viewer.svg;

  const onClick = (e: MouseEvent) => {
    const bubble = (e.target as Element | null)?.closest('[data-sf-quick-duplicate]');
    if (!bubble) return;
    const direction = bubble.getAttribute('data-sf-quick-duplicate') as 'top' | 'right' | 'bottom' | 'left';
    // The bubble's own group carries the owner id (viewer/selectionOverlay.ts's
    // overlayGroup sets data-sf-selection-overlay, not data-sf-id — the bubble
    // isn't a scene node itself), so resolveOwner walking up from it wouldn't
    // find anything; read it off the enclosing overlay group directly instead.
    const ownerId = bubble.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
    if (!ownerId) return;
    const primary = findOwnerNode(svg, ownerId, isPrimary);
    const owner = primary ? resolveOwner(primary) : null;
    if (!owner) return;
    emitter.emit('quickDuplicate', { owner, direction });
  };

  svg.addEventListener('click', onClick);

  return {
    destroy() {
      svg.removeEventListener('click', onClick);
    },
  };
}
