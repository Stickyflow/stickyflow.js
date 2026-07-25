// Drag-to-move a shape, with a live preview of its attached links (see
// linkPreview.ts) — reusing the real router, not an approximation, so an
// orthogonal link still looks orthogonal and a curved one still curves while
// dragging. (DOM code — browser-verified, like textEdit.ts.)
import type { Viewer, OwnerRef } from '../viewer';
import { resolveOwner } from '../viewer/contract';
import { findAllOwnerNodes, findOwnerNode, isPrimary } from '../viewer/domQuery';
import type { Bounds } from '../model/geometry/router';
import { findLiveLinks, updateLiveLinks, type LiveLink } from './linkPreview';
import { Emitter } from './events';

export interface MoveDragHandle {
  destroy(): void;
}

const MOVABLE_ROLES = new Set(['entity']);
const SCREEN_DRAG_THRESHOLD = 3;

const offsetBounds = (b: Bounds, dx: number, dy: number): Bounds => ({ x: b.x + dx, y: b.y + dy, width: b.width, height: b.height });

interface DragState {
  owner: OwnerRef;
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
  overlay: SVGGElement | null;
  overlayBaseTransform: string | null;
  draggedBounds: Bounds;
  liveLinks: LiveLink[];
  pointerId: number;
  startScreen: { x: number; y: number };
  startUser: { x: number; y: number };
  moved: boolean;
}

export function bindShapeMovement(viewer: Viewer, emitter: Emitter): MoveDragHandle {
  const svg = viewer.svg;
  let drag: DragState | null = null;

  const userPoint = (e: PointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const applyTransform = (dx: number, dy: number) => {
    if (!drag) return;
    drag.nodes.forEach((node, i) => {
      const base = drag!.baseTransforms[i];
      node.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
    });
    if (drag.overlay) {
      const base = drag.overlayBaseTransform;
      drag.overlay.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
    }
    updateLiveLinks(drag.liveLinks, offsetBounds(drag.draggedBounds, dx, dy));
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    const owner = resolveOwner(e.target as Element | null);
    if (!owner || !MOVABLE_ROLES.has(owner.role)) return;
    const nodes = findAllOwnerNodes(svg, owner.id);
    const primary = findOwnerNode(svg, owner.id, isPrimary);
    if (!nodes.length || !primary) return;
    const overlay = svg.querySelector<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(owner.id)}"]`);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag = {
      owner,
      nodes,
      baseTransforms: nodes.map(n => n.getAttribute('transform')),
      overlay,
      overlayBaseTransform: overlay?.getAttribute('transform') ?? null,
      draggedBounds: primary.getBBox(),
      liveLinks: findLiveLinks(svg, owner.id),
      pointerId: e.pointerId,
      startScreen: { x: e.clientX, y: e.clientY },
      startUser: userPoint(e),
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      const screenDist = Math.hypot(e.clientX - drag.startScreen.x, e.clientY - drag.startScreen.y);
      if (screenDist < SCREEN_DRAG_THRESHOLD) return;
      drag.moved = true;
    }
    const p = userPoint(e);
    applyTransform(p.x - drag.startUser.x, p.y - drag.startUser.y);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    (e.target as Element).releasePointerCapture?.(d.pointerId);
    if (!d.moved) return;
    const p = userPoint(e);
    emitter.emit('moveChange', { owner: d.owner, dx: p.x - d.startUser.x, dy: p.y - d.startUser.y });
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
