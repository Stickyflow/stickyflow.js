import type { Bounds } from '../model/geometry/router';
import type { OwnerRef, Viewer } from '../viewer';
import { clearAlignmentGuides, type GuideLine, updateAlignmentGuides } from '../viewer/alignmentGuideOverlay';
import { isCameraGesture, resolveOwner } from '../viewer/contract';
import { findAllOwnerNodes, findOwnerNode, findSnapCandidateBounds, isPrimary, pxPerUnit } from '../viewer/domQuery';
import type { Emitter } from './events';
import { findLiveLinks, type LiveLink, updateLiveLinks } from './linkPreview';
import { computeSnap, MOVE_ACTIVE_POINTS, nearestCandidates } from './snapGeometry';

export interface MoveDragHandle {
  destroy(): void;
}

const MOVABLE_ROLES = new Set(['entity']);
const SCREEN_DRAG_THRESHOLD = 3;
const SNAP_THRESHOLD_PX = 20;
const GUIDE_OVERHANG = 10;
const MOVE_GUIDE_COLOR = '#8b5cf6';

const offsetBounds = (b: Bounds, dx: number, dy: number): Bounds => ({
  x: b.x + dx,
  y: b.y + dy,
  width: b.width,
  height: b.height,
});

const applyGroupTransform = (
  nodes: SVGGraphicsElement[],
  baseTransforms: (string | null)[],
  dx: number,
  dy: number,
) => {
  nodes.forEach((node, i) => {
    const base = baseTransforms[i];
    node.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
  });
};

interface DraggedEntity {
  owner: OwnerRef;
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
  overlays: SVGGElement[];
  overlayBaseTransforms: (string | null)[];
  draggedBounds: Bounds;
  liveLinks: LiveLink[];
}

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
      applyGroupTransform(entity.overlays, entity.overlayBaseTransforms, dx, dy);
      updateLiveLinks(entity.liveLinks, offsetBounds(entity.draggedBounds, dx, dy));
    }
    for (const link of drag.internalLinks) applyGroupTransform(link.nodes, link.baseTransforms, dx, dy);
  };

  const snappedDelta = (
    d: DragState,
    rawDx: number,
    rawDy: number,
  ): { dx: number; dy: number; guides: GuideLine[] } => {
    const lead = d.entities[0];
    const liveLeadBounds = offsetBounds(lead.draggedBounds, rawDx, rawDy);
    const excludeIds = new Set(d.entities.map(entity => entity.owner.id));
    const candidates = nearestCandidates(liveLeadBounds, findSnapCandidateBounds(svg, excludeIds));
    const threshold = SNAP_THRESHOLD_PX / pxPerUnit(svg);
    const snap = computeSnap(liveLeadBounds, candidates, {
      threshold,
      activeX: MOVE_ACTIVE_POINTS,
      activeY: MOVE_ACTIVE_POINTS,
      guideOverhang: GUIDE_OVERHANG,
    });
    return {
      dx: rawDx + snap.x.delta,
      dy: rawDy + snap.y.delta,
      guides: [snap.x.guide, snap.y.guide].filter((g): g is GuideLine => g !== null),
    };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    if (isCameraGesture(e)) return;
    const owner = resolveOwner(e.target as Element | null);
    if (!owner || !MOVABLE_ROLES.has(owner.role)) return;

    const selection = viewer.getSelection();
    const group = selection.some(o => o.id === owner.id) ? selection.filter(o => MOVABLE_ROLES.has(o.role)) : [owner];
    const groupIds = new Set(group.map(o => o.id));

    const entities: DraggedEntity[] = [];
    for (const o of group) {
      const nodes = findAllOwnerNodes(svg, o.id);
      const primary = findOwnerNode(svg, o.id, isPrimary);
      if (!nodes.length || !primary) continue;
      const overlays = [...svg.querySelectorAll<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(o.id)}"]`)];
      const draggedBounds = primary.getBBox();
      const liveLinks = findLiveLinks(svg, o.id, draggedBounds).filter(link => {
        const otherId = link.path.getAttribute(link.draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
        return !otherId || !groupIds.has(otherId);
      });
      entities.push({
        owner: o,
        nodes,
        baseTransforms: nodes.map(n => n.getAttribute('transform')),
        overlays,
        overlayBaseTransforms: overlays.map(g => g.getAttribute('transform')),
        draggedBounds,
        liveLinks,
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
    const { dx, dy, guides } = snappedDelta(drag, p.x - drag.startUser.x, p.y - drag.startUser.y);
    applyTransform(dx, dy);
    updateAlignmentGuides(svg, guides, MOVE_GUIDE_COLOR);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    (e.target as Element).releasePointerCapture?.(d.pointerId);
    clearAlignmentGuides(svg);
    if (!d.moved) return;
    const p = userPoint(e);
    const { dx, dy } = snappedDelta(d, p.x - d.startUser.x, p.y - d.startUser.y);
    d.entities.forEach(entity => {
      emitter.emit('moveChange', { owner: entity.owner, dx, dy });
    });
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
