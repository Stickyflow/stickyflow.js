import { localShapePath } from '../../model/geometry/shapes'
import { wrapText } from '../../model/geometry/text'
import type { Bounds } from '../../model/geometry/router'
import type { ShapeType } from '../../model/shapes'
import { resizeHandlePositions, updateQuickDuplicateBubbles } from '../../viewer/selectionOverlay'
import { updateLiveLinks } from '../linkPreview'
import type { ResizeDragState } from './state'

const SVG_NS = 'http://www.w3.org/2000/svg'

function reCenterRotation(el: SVGGraphicsElement, bounds: Bounds): void {
  const transform = el.getAttribute('transform');
  const match = transform && /rotate\(([-\d.]+)/.exec(transform);
  if (!match) return;
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  el.setAttribute('transform', `rotate(${match[1]} ${cx} ${cy})`);
}

export function applySingleNodeBounds(primary: SVGGraphicsElement, kind: string | null, bounds: Bounds): void {
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

export function applyCompositeScale(nodes: SVGGraphicsElement[], startBounds: Bounds, liveBounds: Bounds): void {
  const sx = liveBounds.width / startBounds.width, sy = liveBounds.height / startBounds.height;
  const transform = `translate(${liveBounds.x} ${liveBounds.y}) scale(${sx} ${sy}) translate(${-startBounds.x} ${-startBounds.y})`;
  nodes.forEach(node => node.setAttribute('transform', transform));
}

/** Re-wraps and re-centers a shape's text label at its live-resized bounds,
 *  using the exact same math renderSceneToSvg.ts's textSvg() does — so it
 *  reads identically whether it's "being resized" or "just rendered".
 *
 *  §1.4 Infographics inline **bold**: deliberately NOT bold-aware. This path
 *  already re-joins the DOM's per-line tspans from the primary node's
 *  collapsed, single-line aria-label (see rawText below) before re-wrapping
 *  with the plain heuristic — a multi-line label's original line breaks are
 *  already lost here today, independent of this feature. A transient resize
 *  preview one line-wrap-boundary off from the final static render (replaced
 *  the instant the host reflects the drop) is a minor, acceptable
 *  simplification given that pre-existing gap, not a new regression — same
 *  "live path can lag slightly behind the final-render path" precedent as
 *  atlas's own live-patch path not handling Frame/Swimlane style edits.
 */
export function applyLiveText(textEl: SVGTextElement, rawText: string, bounds: Bounds, strokeWidth: number): void {
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

function updateSelectionOverlay(overlay: SVGGElement, bounds: Bounds): void {
  const ring = overlay.querySelector('rect:not([data-sf-resize-handle])')
  ring?.setAttribute('x', String(bounds.x - 1))
  ring?.setAttribute('y', String(bounds.y - 1))
  ring?.setAttribute('width', String(bounds.width + 2))
  ring?.setAttribute('height', String(bounds.height + 2))

  for (const [cx, cy, name] of resizeHandlePositions(bounds)) {
    const handle = overlay.querySelector(`[data-sf-resize-handle="${name}"]`)
    if (!handle) continue
    const size = Number(handle.getAttribute('width')) || 6
    handle.setAttribute('x', String(cx - size / 2))
    handle.setAttribute('y', String(cy - size / 2))
  }
}

export function applyResizePreview(drag: ResizeDragState, bounds: Bounds): void {
  if (drag.isComposite) applyCompositeScale(drag.geometryNodes, drag.startBounds, bounds)
  else drag.geometryNodes.forEach(node => applySingleNodeBounds(node, drag.kind, bounds))
  if (drag.overlay) updateSelectionOverlay(drag.overlay, bounds)
  if (drag.text) applyLiveText(drag.text.el, drag.text.rawText, bounds, drag.text.strokeWidth)
  if (drag.bubbles) updateQuickDuplicateBubbles(drag.bubbles, bounds)
  updateLiveLinks(drag.liveLinks, bounds)
}
