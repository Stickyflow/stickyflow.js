// Drag a corner handle (see selectionOverlay.ts) to resize a shape, with the
// same live link-following as moveDrag.ts. Single-node shapes (rect/ellipse/
// the localShapePath outlines — diamond, hexagon, …) get true live geometry,
// identical to what the static renderer would draw at that size. Composite
// shapes (cylinder, person — more than one node) get a scale-transform
// approximation instead: reproducing each of their sub-node formulas live
// wasn't worth it for a preview that's replaced by the real render the
// instant the host reflects the drop. The text label re-wraps live too (see
// applyLiveText, using the same wrapText the static renderer does) via the
// primary node's own aria-label as the source text — the DOM only ever has
// the already-wrapped tspans, which would double-wrap on re-join.
// (DOM code — browser-verified, like moveDrag.ts.)
import type { Viewer, OwnerRef } from '../viewer';
import { resolveOwner } from '../viewer/contract';
import { findAllOwnerNodes, findOwnerNode, isPrimary, isTextLabel } from '../viewer/domQuery';
import { updateQuickDuplicateBubbles, type ResizeHandle } from '../viewer/selectionOverlay';
import { localShapePath } from '../model/geometry/shapes';
import { wrapText } from '../model/geometry/text';
import type { Bounds } from '../model/geometry/router';
import type { ShapeType } from '../model/shapes';
import { findLiveLinks, updateLiveLinks, type LiveLink } from './linkPreview';
import { Emitter } from './events';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ResizeDragHandle {
  destroy(): void;
}

const RESIZABLE_ROLES = new Set(['entity']);
const MIN_SIZE = 10;
const COMPOSITE_KINDS = new Set(['cylinder', 'person']);

const HANDLE_ANCHOR: Record<ResizeHandle, { fixedX: 'left' | 'right'; fixedY: 'top' | 'bottom' }> = {
  'top-left': { fixedX: 'right', fixedY: 'bottom' },
  'top-right': { fixedX: 'left', fixedY: 'bottom' },
  'bottom-left': { fixedX: 'right', fixedY: 'top' },
  'bottom-right': { fixedX: 'left', fixedY: 'top' },
};

/** New bounds for dragging `handle` to `pointer`, keeping the opposite corner
 *  fixed. Works even if the pointer crosses past that corner (min/max, not a
 *  signed width/height) — the shape just flips instead of going negative. */
function resizedBounds(start: Bounds, handle: ResizeHandle, pointer: { x: number; y: number }): Bounds {
  const anchor = HANDLE_ANCHOR[handle];
  const fixedX = anchor.fixedX === 'left' ? start.x : start.x + start.width;
  const fixedY = anchor.fixedY === 'top' ? start.y : start.y + start.height;
  const x1 = Math.min(fixedX, pointer.x), x2 = Math.max(fixedX, pointer.x);
  const y1 = Math.min(fixedY, pointer.y), y2 = Math.max(fixedY, pointer.y);
  return { x: x1, y: y1, width: Math.max(MIN_SIZE, x2 - x1), height: Math.max(MIN_SIZE, y2 - y1) };
}

/** Keep a rotated shape's pivot centered on its own (live-resized) bounds —
 *  otherwise it visibly swings off-center as it resizes. Only handles a bare
 *  `rotate(deg cx cy)`, which is exactly what renderSceneToSvg.ts ever emits
 *  for a shape (never combined with another transform on the same node). */
function reCenterRotation(el: SVGGraphicsElement, bounds: Bounds): void {
  const transform = el.getAttribute('transform');
  const match = transform && /rotate\(([-\d.]+)/.exec(transform);
  if (!match) return;
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  el.setAttribute('transform', `rotate(${match[1]} ${cx} ${cy})`);
}

function applySingleNodeBounds(primary: SVGGraphicsElement, kind: string | null, bounds: Bounds): void {
  const tag = primary.tagName.toLowerCase();
  if (tag === 'rect') {
    primary.setAttribute('x', String(bounds.x));
    primary.setAttribute('y', String(bounds.y));
    primary.setAttribute('width', String(bounds.width));
    primary.setAttribute('height', String(bounds.height));
    // A pill's rx is always half the shorter side (that's what makes it a
    // pill) — recomputed live. A rounded_rectangle's corner radius is a fixed
    // pixel value the DOM doesn't expose; left as-is rather than guessed.
    if (kind === 'pill') primary.setAttribute('rx', String(Math.min(bounds.width, bounds.height) / 2));
  } else if (tag === 'ellipse') {
    primary.setAttribute('cx', String(bounds.x + bounds.width / 2));
    primary.setAttribute('cy', String(bounds.y + bounds.height / 2));
    primary.setAttribute('rx', String(bounds.width / 2));
    primary.setAttribute('ry', String(bounds.height / 2));
  } else if (tag === 'path' && kind) {
    const d = localShapePath(kind as ShapeType, bounds.x, bounds.y, bounds.width, bounds.height);
    if (d) primary.setAttribute('d', d);
  }
  reCenterRotation(primary, bounds);
}

function applyCompositeScale(nodes: SVGGraphicsElement[], startBounds: Bounds, liveBounds: Bounds): void {
  const sx = liveBounds.width / startBounds.width, sy = liveBounds.height / startBounds.height;
  const transform = `translate(${liveBounds.x} ${liveBounds.y}) scale(${sx} ${sy}) translate(${-startBounds.x} ${-startBounds.y})`;
  nodes.forEach(node => node.setAttribute('transform', transform));
}

/** Re-wraps and re-centers a shape's text label at its live-resized bounds,
 *  using the exact same math renderSceneToSvg.ts's textSvg() does — so it
 *  reads identically whether it's "being resized" or "just rendered". */
function applyLiveText(textEl: SVGTextElement, rawText: string, bounds: Bounds, strokeWidth: number): void {
  const fontSize = parseFloat(textEl.getAttribute('font-size') || '14');
  const anchor = textEl.getAttribute('text-anchor');
  const align: 'left' | 'center' | 'right' = anchor === 'start' ? 'left' : anchor === 'end' ? 'right' : 'center';
  const verticalAlign = (textEl.getAttribute('data-sf-valign') as 'top' | 'middle' | 'bottom' | null) ?? 'middle';
  const lineHeight = Number(textEl.getAttribute('data-sf-line-height')) || 1.3;

  const padding = Math.max(8, strokeWidth * 2);
  const width = Math.max(0, bounds.width - padding * 2);
  const height = Math.max(0, bounds.height - padding * 2);
  const boxX = bounds.x + padding, boxY = bounds.y + padding;
  const lines = wrapText(rawText, width, fontSize);

  const linePx = fontSize * lineHeight, contentHeight = lines.length * linePx;
  const firstY = verticalAlign === 'top' ? boxY + fontSize
    : verticalAlign === 'bottom' ? boxY + height - contentHeight + fontSize
      : boxY + (height - contentHeight) / 2 + fontSize;
  const x = align === 'left' ? boxX : align === 'right' ? boxX + width : boxX + width / 2;

  textEl.setAttribute('x', String(x));
  textEl.setAttribute('y', String(firstY));
  while (textEl.firstChild) textEl.removeChild(textEl.firstChild);
  lines.forEach((line, i) => {
    const tspan = document.createElementNS(SVG_NS, 'tspan');
    tspan.setAttribute('x', String(x));
    if (i) tspan.setAttribute('dy', `${linePx}px`);
    tspan.textContent = line;
    textEl.appendChild(tspan);
  });
  reCenterRotation(textEl, bounds);
}

interface DragState {
  owner: OwnerRef;
  handle: ResizeHandle;
  kind: string | null;
  isComposite: boolean;
  geometryNodes: SVGGraphicsElement[];
  overlay: SVGGElement | null;
  // The quick-duplicate bubbles live in their OWN sibling group sharing the
  // same data-sf-selection-overlay id (see selectionOverlay.ts) — not inside
  // `overlay` itself, which only ever holds the ring/handles — so tracking a
  // live resize needs this looked up and repositioned separately.
  bubbles: SVGGElement | null;
  startBounds: Bounds;
  liveLinks: LiveLink[];
  pointerId: number;
  moved: boolean;
  /** Only set when the entity has a text label — see applyLiveText. */
  text: { el: SVGTextElement; rawText: string; strokeWidth: number } | null;
}

export function bindShapeResize(viewer: Viewer, emitter: Emitter): ResizeDragHandle {
  const svg = viewer.svg;
  let drag: DragState | null = null;

  const userPoint = (e: PointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const applyBounds = (bounds: Bounds) => {
    if (!drag) return;
    if (drag.isComposite) applyCompositeScale(drag.geometryNodes, drag.startBounds, bounds);
    else drag.geometryNodes.forEach(node => applySingleNodeBounds(node, drag!.kind, bounds));
    if (drag.overlay) {
      // Re-paint just the ring/handles at the live bounds — same shape as
      // shapeSelectionOverlay's own <rect>, offset 1px outside.
      const ring = drag.overlay.querySelector('rect:not([data-sf-resize-handle])');
      ring?.setAttribute('x', String(bounds.x - 1));
      ring?.setAttribute('y', String(bounds.y - 1));
      ring?.setAttribute('width', String(bounds.width + 2));
      ring?.setAttribute('height', String(bounds.height + 2));
      const corners: Record<ResizeHandle, [number, number]> = {
        'top-left': [bounds.x, bounds.y],
        'top-right': [bounds.x + bounds.width, bounds.y],
        'bottom-left': [bounds.x, bounds.y + bounds.height],
        'bottom-right': [bounds.x + bounds.width, bounds.y + bounds.height],
      };
      (Object.keys(corners) as ResizeHandle[]).forEach(name => {
        const [cx, cy] = corners[name];
        const handleEl = drag!.overlay!.querySelector(`[data-sf-resize-handle="${name}"]`);
        if (!handleEl) return;
        const size = Number(handleEl.getAttribute('width')) || 6;
        handleEl.setAttribute('x', String(cx - size / 2));
        handleEl.setAttribute('y', String(cy - size / 2));
      });
    }
    if (drag.text) applyLiveText(drag.text.el, drag.text.rawText, bounds, drag.text.strokeWidth);
    if (drag.bubbles) updateQuickDuplicateBubbles(drag.bubbles, bounds);
    updateLiveLinks(drag.liveLinks, bounds);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    const handleEl = (e.target as Element | null)?.closest?.('[data-sf-resize-handle]') as SVGGraphicsElement | null;
    if (!handleEl) return;
    const handle = handleEl.getAttribute('data-sf-resize-handle') as ResizeHandle;
    const overlay = handleEl.closest('[data-sf-selection-overlay]') as SVGGElement | null;
    const ownerId = overlay?.getAttribute('data-sf-selection-overlay');
    if (!ownerId) return;
    const bubbles = [...svg.querySelectorAll<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(ownerId)}"]`)]
      .find(g => g !== overlay && g.querySelector('circle[data-sf-quick-duplicate]')) ?? null;
    const primary = findOwnerNode(svg, ownerId, isPrimary);
    if (!primary) return;
    const owner = resolveOwner(primary);
    if (!owner || !RESIZABLE_ROLES.has(owner.role)) return;
    const kind = primary.getAttribute('data-sf-kind');
    const isComposite = !!kind && COMPOSITE_KINDS.has(kind);
    const allNodes = findAllOwnerNodes(svg, ownerId);
    const geometryNodes = allNodes.filter(n => !isTextLabel(n));
    if (!geometryNodes.length) return;
    const textEl = allNodes.find(isTextLabel) as SVGTextElement | undefined;
    // aria-label is the shape's raw, unwrapped text (collapsed to one line —
    // see contractAttrs' doc comment) — the DOM only otherwise has the
    // already-wrapped tspans, which can't be re-wrapped at a new width
    // without first un-wrapping them.
    const rawText = primary.getAttribute('aria-label');
    const text = textEl && rawText
      ? { el: textEl, rawText, strokeWidth: Number(primary.getAttribute('stroke-width')) || 2 }
      : null;
    handleEl.setPointerCapture?.(e.pointerId);
    const startBounds = primary.getBBox();
    drag = {
      owner, handle, kind, isComposite, geometryNodes, overlay, bubbles, text,
      startBounds,
      liveLinks: findLiveLinks(svg, ownerId, startBounds),
      pointerId: e.pointerId,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.moved = true;
    applyBounds(resizedBounds(drag.startBounds, drag.handle, userPoint(e)));
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    (e.target as Element)?.releasePointerCapture?.(d.pointerId);
    if (!d.moved) return;
    const next = resizedBounds(d.startBounds, d.handle, userPoint(e));
    emitter.emit('resizeChange', {
      owner: d.owner,
      dx: next.x - d.startBounds.x, dy: next.y - d.startBounds.y,
      dWidth: next.width - d.startBounds.width, dHeight: next.height - d.startBounds.height,
      x: next.x, y: next.y, width: next.width, height: next.height,
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
