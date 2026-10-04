import type { SankeyNodeDragLink, SankeyNodeDragState } from './types';

// Mirrors sankeyRibbonPath() in renderScene/charts/renderers/sankey/links.ts -
// only the end attached to the dragged node shifts by (dx, dy); the other end
// stays put, and the control-point x is recomputed from both current ends so
// the curve keeps reading correctly as the node moves horizontally too.
function redrawLink(link: SankeyNodeDragLink, dx: number, dy: number): void {
  const sx = link.endsAtSource ? link.sx + dx : link.sx;
  const sTop = link.endsAtSource ? link.sTop + dy : link.sTop;
  const sBottom = link.endsAtSource ? link.sBottom + dy : link.sBottom;
  const tx = link.endsAtSource ? link.tx : link.tx + dx;
  const tTop = link.endsAtSource ? link.tTop : link.tTop + dy;
  const tBottom = link.endsAtSource ? link.tBottom : link.tBottom + dy;
  const cx = (sx + tx) / 2;
  const d = [
    `M ${sx} ${sTop}`,
    `C ${cx} ${sTop} ${cx} ${tTop} ${tx} ${tTop}`,
    `L ${tx} ${tBottom}`,
    `C ${cx} ${tBottom} ${cx} ${sBottom} ${sx} ${sBottom}`,
    'Z',
  ].join(' ');
  link.element.setAttribute('d', d);
}

export function updateSankeyNodeDragPreview(drag: SankeyNodeDragState, dx: number, dy: number): void {
  drag.rect.setAttribute('transform', `translate(${dx}, ${dy})`);
  drag.label?.setAttribute('transform', `translate(${dx}, ${dy})`);
  for (const link of drag.links) {
    redrawLink(link, dx, dy);
  }
}

export function clearSankeyNodeDragPreview(drag: SankeyNodeDragState): void {
  drag.rect.removeAttribute('transform');
  drag.label?.removeAttribute('transform');
  for (const link of drag.links) {
    link.element.setAttribute('d', link.originalD);
  }
}
