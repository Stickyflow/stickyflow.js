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

const applyGroupTransform = (nodes: SVGGraphicsElement[], baseTransforms: (string | null)[], dx: number, dy: number) => {
  nodes.forEach((node, i) => {
    const base = baseTransforms[i];
    node.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
  });
};

/** One dragged entity: its own nodes/overlay plus the links it drags live
 *  (an internal link — see below — is excluded here even if attached, since
 *  it's translated as its own unit instead of re-routed). */
interface DraggedEntity {
  owner: OwnerRef;
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
  overlay: SVGGElement | null;
  overlayBaseTransform: string | null;
  draggedBounds: Bounds;
  liveLinks: LiveLink[];
}

/** A link whose BOTH ends are inside the dragged group: since every group
 *  member moves by the identical (dx, dy), the link's shape relative to its
 *  two endpoints never changes — cheaper and more correct to translate it
 *  rigidly (like an entity) than to re-route it against a "moving" other end
 *  the router has no notion of. */
interface DraggedInternalLink {
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
}

interface DragState {
  entities: DraggedEntity[];
  internalLinks: DraggedInternalLink[];
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
    for (const entity of drag.entities) {
      applyGroupTransform(entity.nodes, entity.baseTransforms, dx, dy);
      if (entity.overlay) {
        const base = entity.overlayBaseTransform;
        entity.overlay.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
      }
      updateLiveLinks(entity.liveLinks, offsetBounds(entity.draggedBounds, dx, dy));
    }
    for (const link of drag.internalLinks) applyGroupTransform(link.nodes, link.baseTransforms, dx, dy);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    const owner = resolveOwner(e.target as Element | null);
    if (!owner || !MOVABLE_ROLES.has(owner.role)) return;

    // Dragging a shape that's part of a multi-selection moves the whole
    // selection together, preserving relative positions — dragging an
    // unselected shape (even while others are selected) only moves that one,
    // leaving the rest of the selection untouched.
    const selection = viewer.getSelection();
    const group = selection.some(o => o.id === owner.id)
      ? selection.filter(o => MOVABLE_ROLES.has(o.role))
      : [owner];
    const groupIds = new Set(group.map(o => o.id));

    const entities: DraggedEntity[] = [];
    for (const o of group) {
      const nodes = findAllOwnerNodes(svg, o.id);
      const primary = findOwnerNode(svg, o.id, isPrimary);
      if (!nodes.length || !primary) continue;
      const overlay = svg.querySelector<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(o.id)}"]`);
      const draggedBounds = primary.getBBox();
      // Links attached to more than one group member are handled separately
      // (see internalLinks below) — excluding them here stops the same
      // <path> from being both rigidly translated AND re-routed.
      const liveLinks = findLiveLinks(svg, o.id).filter(link => {
        const otherId = link.path.getAttribute(link.draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
        return !otherId || !groupIds.has(otherId);
      });
      entities.push({
        owner: o, nodes, baseTransforms: nodes.map(n => n.getAttribute('transform')),
        overlay, overlayBaseTransform: overlay?.getAttribute('transform') ?? null,
        draggedBounds, liveLinks,
      });
    }
    if (!entities.length) return;

    const internalLinks: DraggedInternalLink[] = [];
    if (groupIds.size > 1) {
      svg.querySelectorAll<SVGPathElement>('path[data-sf-from][data-sf-to]').forEach(path => {
        const from = path.getAttribute('data-sf-from');
        const to = path.getAttribute('data-sf-to');
        const linkId = path.getAttribute('data-sf-id');
        if (!from || !to || !linkId || !groupIds.has(from) || !groupIds.has(to)) return;
        const nodes = findAllOwnerNodes(svg, linkId);
        if (nodes.length) internalLinks.push({ nodes, baseTransforms: nodes.map(n => n.getAttribute('transform')) });
      });
    }

    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag = {
      entities,
      internalLinks,
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
    const dx = p.x - d.startUser.x, dy = p.y - d.startUser.y;
    // One event per moved entity, same (dx, dy) — keeps MoveChangeEvent's
    // existing single-owner shape so a host that doesn't know about
    // multi-select still works unmodified, just receiving several events
    // instead of one.
    d.entities.forEach(entity => emitter.emit('moveChange', { owner: entity.owner, dx, dy }));
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
