import type { SankeyNodeDragState } from './types';

const HIGHLIGHT_COLOR = '#9b42df';
const HIGHLIGHT_WIDTH = '2.5';

export function candidateBeforeId(drag: SankeyNodeDragState, pointerY: number): string | null {
  const next = drag.siblings.find(sibling => sibling.centerY > pointerY);
  return next?.nodeId ?? null;
}

function redrawLink(link: SankeyNodeDragLinkLike, dx: number, dy: number): void {
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

type SankeyNodeDragLinkLike = SankeyNodeDragState['links'][number];

export function updateSankeyNodeDragPreview(drag: SankeyNodeDragState, dx: number, dy: number, pointerY: number): void {
  drag.rect.setAttribute('transform', `translate(${dx}, ${dy})`);
  drag.label?.setAttribute('transform', `translate(${dx}, ${dy})`);
  for (const link of drag.links) {
    redrawLink(link, dx, dy);
  }

  const beforeId = candidateBeforeId(drag, pointerY);
  const target = drag.siblings.find(sibling => sibling.nodeId === beforeId)?.element ?? null;
  if (target === drag.highlighted) {
    return;
  }
  if (drag.highlighted) {
    drag.highlighted.removeAttribute('stroke');
    drag.highlighted.removeAttribute('stroke-width');
  }
  if (target) {
    target.setAttribute('stroke', HIGHLIGHT_COLOR);
    target.setAttribute('stroke-width', HIGHLIGHT_WIDTH);
  }
  drag.highlighted = target;
}

export function clearSankeyNodeDragPreview(drag: SankeyNodeDragState): void {
  drag.rect.removeAttribute('transform');
  drag.label?.removeAttribute('transform');
  for (const link of drag.links) {
    link.element.setAttribute('d', link.originalD);
  }
  if (drag.highlighted) {
    drag.highlighted.removeAttribute('stroke');
    drag.highlighted.removeAttribute('stroke-width');
    drag.highlighted = null;
  }
}
