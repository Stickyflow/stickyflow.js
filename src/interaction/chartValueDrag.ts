// Drag a bar's top edge (or a line/scatter point) vertically to change the
// single value it draws. Unlike moveDrag/resizeDrag this never touches
// geometry the host owns — a chart mark's position IS its datum, so the
// gesture edits `Series { values: [...] }` instead of `layout {}`.
//
// Addressing comes entirely from the DOM contract: the mark carries
// data-sf-series/data-sf-value-index, and the chart's primary node carries
// data-sf-value-scale (see renderScene.ts) for the pixel -> value mapping.
// Nothing here re-derives axis geometry from tick text or element ids.
// (DOM code — browser-verified, like moveDrag.ts.)
import type { Viewer, OwnerRef } from '../viewer';
import { resolveOwner, isCameraGesture } from '../viewer/contract';
import { findOwnerNode, isPrimary } from '../viewer/domQuery';
import { Emitter } from './events';

export interface ChartValueDragHandle {
  destroy(): void;
}

interface ValueScale {
  plotY: number;
  plotHeight: number;
  min: number;
  max: number;
}

interface DragState {
  owner: OwnerRef;
  series: string;
  index: number;
  scale: ValueScale;
  el: SVGGraphicsElement;
  /** Baseline y of the mark, kept fixed while its top edge follows the
   *  pointer — a bar grows from the axis, it doesn't move. */
  baseY: number;
  isBar: boolean;
  pointerId: number;
  moved: boolean;
  lastValue: number;
}

function parseScale(el: Element | null): ValueScale | null {
  const raw = el?.getAttribute('data-sf-value-scale');
  if (!raw) return null;
  const [plotY, plotHeight, min, max] = raw.split(',').map(Number);
  if ([plotY, plotHeight, min, max].some(n => !Number.isFinite(n)) || plotHeight <= 0 || max === min) return null;
  return { plotY, plotHeight, min, max };
}

const valueAt = (y: number, s: ValueScale): number =>
  Math.min(Math.max(s.min + ((s.plotY + s.plotHeight - y) / s.plotHeight) * (s.max - s.min), s.min), s.max);

const pixelFor = (value: number, s: ValueScale): number =>
  s.plotY + s.plotHeight - ((value - s.min) / (s.max - s.min)) * s.plotHeight;

/** Bind drag-to-change-value on a chart's own marks. Emits `chartValueChange`
 *  on release; the live preview reverts unless the host reflects it. */
export function bindChartValueDrag(viewer: Viewer, emitter: Emitter): ChartValueDragHandle {
  const svg = viewer.svg;
  let drag: DragState | null = null;

  const userY = (e: PointerEvent): number => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()).y;
  };

  const preview = (value: number) => {
    if (!drag) return;
    const y = pixelFor(value, drag.scale);
    if (drag.isBar) {
      drag.el.setAttribute('y', String(Math.min(y, drag.baseY)));
      drag.el.setAttribute('height', String(Math.max(0, Math.abs(drag.baseY - y))));
    } else {
      drag.el.setAttribute('cy', String(y));
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag || isCameraGesture(e)) return;
    const mark = (e.target as Element | null)?.closest?.('[data-sf-value-index]') as SVGGraphicsElement | null;
    if (!mark) return;
    const owner = resolveOwner(mark);
    if (!owner || owner.role !== 'chart') return;
    const series = mark.getAttribute('data-sf-series');
    const index = Number(mark.getAttribute('data-sf-value-index'));
    if (!series || !Number.isInteger(index)) return;
    const scale = parseScale(findOwnerNode(svg, owner.id, isPrimary));
    if (!scale) return;
    // A datum can be drawn by more than one node — a bar plus the error
    // whisker over its top edge, which is exactly where a reader grabs. Both
    // carry the same series/index; the geometry one is what gets previewed.
    const geometry = [...svg.querySelectorAll<SVGGraphicsElement>(
      `[data-sf-id="${CSS.escape(owner.id)}"][data-sf-series="${CSS.escape(series)}"][data-sf-value-index="${index}"]`,
    )].find(el => el.tagName.toLowerCase() === 'rect' || el.tagName.toLowerCase() === 'ellipse');
    if (!geometry) return;
    const isBar = geometry.tagName.toLowerCase() === 'rect';
    // A stacked segment's own baseline is wherever the segment below it
    // ended, not the axis — read it off the mark rather than assuming.
    const baseY = isBar
      ? Number(geometry.getAttribute('y')) + Number(geometry.getAttribute('height'))
      : scale.plotY + scale.plotHeight;
    if (!Number.isFinite(baseY)) return;
    mark.setPointerCapture?.(e.pointerId);
    drag = { owner, series, index, scale, el: geometry, baseY, isBar, pointerId: e.pointerId, moved: false, lastValue: 0 };
    e.stopPropagation();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.moved = true;
    drag.lastValue = valueAt(userY(e), drag.scale);
    preview(drag.lastValue);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    (e.target as Element)?.releasePointerCapture?.(d.pointerId);
    if (!d.moved) return;
    emitter.emit('chartValueChange', { owner: d.owner, series: d.series, index: d.index, value: valueAt(userY(e), d.scale) });
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
