import { createPieSlicePath } from '../../rendering/charts/primitives/pieShape';
import type { PieBoundaryValue } from './boundary';
import type { PieSliceDragState } from './types';

function updateSlicePath(drag: PieSliceDragState, element: SVGGraphicsElement, start: number, end: number): void {
  element.setAttribute(
    'd',
    createPieSlicePath(
      { centerX: drag.centerX, centerY: drag.centerY, outerRadius: drag.outerRadius, innerRadius: drag.innerRadius },
      { start, end },
    ),
  );
}

function updateLabelPercent(svg: SVGSVGElement, ownerId: string, seriesId: string, value: number, total: number): void {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-series="${CSS.escape(seriesId)}"]`;
  const label = [...svg.querySelectorAll<SVGTextElement>(selector)].find(el => el.tagName.toLowerCase() === 'text');
  const tspan = label?.querySelectorAll('tspan')[1];
  if (tspan) {
    tspan.textContent = `${Math.round((value / total) * 100)}%`;
  }
}

export function updatePieSliceDragPreview(svg: SVGSVGElement, drag: PieSliceDragState, split: PieBoundaryValue): void {
  const { boundary } = drag;

  updateSlicePath(drag, drag.beforeElement, boundary.arcStart, split.boundary);
  updateSlicePath(drag, drag.afterElement, split.boundary, boundary.arcEnd);

  updateLabelPercent(svg, drag.owner.id, boundary.before.seriesId, split.beforeValue, drag.total);
  updateLabelPercent(svg, drag.owner.id, boundary.after.seriesId, split.afterValue, drag.total);
}
