import type { Rect } from '../../../model/geometry/types';
import { isCameraGesture, pointerUserPoint, resolveOwner } from '../../dom';
import type { SankeyNodeDragLink, SankeyNodeDragState } from './types';

// Mirrors sankeyRibbonPath() in renderScene/charts/renderers/sankey/links.ts
// exactly - see the comment there. Captures just the 6 numbers a drag needs
// (the 3 repeated-for-bezier-control copies of sx/tx are redundant).
const RIBBON_PATH =
  /^M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+C\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)\s+-?[\d.]+\s+L\s+-?[\d.]+\s+(-?[\d.]+)\s+C\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+(-?[\d.]+)\s+-?[\d.]+\s+-?[\d.]+\s+Z$/;

function isNodePointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

function findNodeRect(event: PointerEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.('[data-sf-mark="sankey-node"]') as SVGGraphicsElement | null;
}

function findNodeLabel(svg: SVGSVGElement, ownerId: string, nodeId: string): SVGGraphicsElement | null {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-mark="sankey-node-label"][data-sf-series="${CSS.escape(nodeId)}"]`;
  return svg.querySelector<SVGGraphicsElement>(selector);
}

function parseRibbonLink(element: SVGGraphicsElement, endsAtSource: boolean): SankeyNodeDragLink | null {
  const d = element.getAttribute('d');
  const match = d?.match(RIBBON_PATH);
  if (!d || !match) {
    return null;
  }
  const [, sx, sTop, tTop, tx, tBottom, sBottom] = match.map(Number) as unknown as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return { element, originalD: d, endsAtSource, sx, sTop, sBottom, tx, tTop, tBottom };
}

function rectOf(element: SVGGraphicsElement): Rect {
  const box = element.getBBox();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function siblingNodeBounds(svg: SVGSVGElement, ownerId: string, rect: SVGGraphicsElement): Rect[] {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-mark="sankey-node"]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)].filter(element => element !== rect).map(rectOf);
}

function connectedLinks(svg: SVGSVGElement, ownerId: string, nodeId: string): SankeyNodeDragLink[] {
  const escapedOwner = CSS.escape(ownerId);
  const escapedNode = CSS.escape(nodeId);
  const asSource = [
    ...svg.querySelectorAll<SVGGraphicsElement>(`[data-sf-id="${escapedOwner}"][data-sf-from="${escapedNode}"]`),
  ];
  const asTarget = [
    ...svg.querySelectorAll<SVGGraphicsElement>(`[data-sf-id="${escapedOwner}"][data-sf-to="${escapedNode}"]`),
  ];
  const links: SankeyNodeDragLink[] = [];
  for (const element of asSource) {
    const link = parseRibbonLink(element, true);
    if (link) {
      links.push(link);
    }
  }
  for (const element of asTarget) {
    const link = parseRibbonLink(element, false);
    if (link) {
      links.push(link);
    }
  }
  return links;
}

export function resolveSankeyNodeDrag(svg: SVGSVGElement, event: PointerEvent): SankeyNodeDragState | null {
  if (!isNodePointer(event)) {
    return null;
  }
  const rect = findNodeRect(event);
  if (!rect) {
    return null;
  }
  const owner = resolveOwner(rect);
  if (owner?.role !== 'chart') {
    return null;
  }
  const nodeId = rect.getAttribute('data-sf-series');
  if (!nodeId) {
    return null;
  }
  const start = pointerUserPoint(svg, event);
  if (!start) {
    return null;
  }

  rect.setPointerCapture?.(event.pointerId);
  return {
    owner,
    pointerId: event.pointerId,
    nodeId,
    rect,
    label: findNodeLabel(svg, owner.id, nodeId),
    startX: start.x,
    startY: start.y,
    originalBounds: rectOf(rect),
    siblingBounds: siblingNodeBounds(svg, owner.id, rect),
    links: connectedLinks(svg, owner.id, nodeId),
    moved: false,
    lastDx: 0,
    lastDy: 0,
  };
}
