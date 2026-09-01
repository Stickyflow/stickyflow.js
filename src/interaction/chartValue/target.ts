import { isCameraGesture, resolveOwner } from '../../viewer/contract';
import { findOwnerNode, isPrimary } from '../../viewer/domQuery';
import { parseValueScale } from './scale';
import type { ChartValueDragState } from './types';

function chartGeometry(svg: SVGSVGElement, ownerId: string, series: string, index: number): SVGGraphicsElement | null {
  const selector =
    `[data-sf-id="${CSS.escape(ownerId)}"]` +
    `[data-sf-series="${CSS.escape(series)}"]` +
    `[data-sf-value-index="${index}"]`;
  return (
    [...svg.querySelectorAll<SVGGraphicsElement>(selector)].find(element => {
      const tag = element.tagName.toLowerCase();
      return tag === 'rect' || tag === 'ellipse';
    }) ?? null
  );
}

export function resolveChartValueDrag(svg: SVGSVGElement, event: PointerEvent): ChartValueDragState | null {
  if (event.button !== 0 || isCameraGesture(event)) {
    return null;
  }
  const mark = (event.target as Element | null)?.closest?.('[data-sf-value-index]') as SVGGraphicsElement | null;
  if (!mark) {
    return null;
  }
  const owner = resolveOwner(mark);
  if (owner?.role !== 'chart') {
    return null;
  }
  const series = mark.getAttribute('data-sf-series');
  const index = Number(mark.getAttribute('data-sf-value-index'));
  if (!series || !Number.isInteger(index)) {
    return null;
  }
  const scale = parseValueScale(findOwnerNode(svg, owner.id, isPrimary));
  if (!scale) {
    return null;
  }
  const element = chartGeometry(svg, owner.id, series, index);
  if (!element) {
    return null;
  }
  const isBar = element.tagName.toLowerCase() === 'rect';
  const baseY = isBar
    ? Number(element.getAttribute('y')) + Number(element.getAttribute('height'))
    : scale.plotY + scale.plotHeight;
  if (!Number.isFinite(baseY)) {
    return null;
  }
  mark.setPointerCapture?.(event.pointerId);
  return { owner, series, index, scale, element, baseY, isBar, pointerId: event.pointerId, moved: false };
}
