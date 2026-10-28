import { AXIS_COS } from '../../model/isometricObject';
import { isometricGeometryOf } from './contract';

export function findOwnerNode<Node extends SVGGraphicsElement = SVGGraphicsElement>(
  svg: SVGSVGElement,
  id: string,
  predicate: (el: Element) => boolean,
): Node | null {
  const nodes = svg.querySelectorAll<Node>(`[data-sf-id="${CSS.escape(id)}"]`);
  for (const el of nodes) {
    if (predicate(el)) {
      return el;
    }
  }
  return null;
}

export function findAllOwnerNodes(svg: SVGSVGElement, id: string): SVGGraphicsElement[] {
  return Array.from(svg.querySelectorAll<SVGGraphicsElement>(`[data-sf-id="${CSS.escape(id)}"]`));
}

export const isPrimary = (el: Element): boolean => el.hasAttribute('data-sf-primary');
export const isTextLabel = (el: Element): boolean =>
  el.tagName.toLowerCase() === 'text' && !el.hasAttribute('data-sf-primary');

export function pointerUserPoint(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  return { x: point.x, y: point.y };
}

export function screenRectOf(el: SVGGraphicsElement): { left: number; top: number; width: number; height: number } {
  const bbox = el.getBBox();
  const ctm = el.getScreenCTM();
  if (!ctm) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const topLeft = new DOMPoint(bbox.x, bbox.y).matrixTransform(ctm);
  const bottomRight = new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(ctm);
  return { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}

export function pxPerUnit(svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect();
  const { width: viewBoxWidth, height: viewBoxHeight } = svg.viewBox.baseVal;
  if (rect.width <= 0 || viewBoxWidth <= 0) {
    return 1;
  }
  const horizontal = rect.width / viewBoxWidth;
  return rect.height > 0 && viewBoxHeight > 0 ? Math.min(horizontal, rect.height / viewBoxHeight) : horizontal;
}

export function findIsometricApexCandidates(
  svg: SVGSVGElement,
  excludeIds: Set<string>,
): Array<{ id: string; apex: { x: number; y: number } }> {
  const results: Array<{ id: string; apex: { x: number; y: number } }> = [];
  svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary][data-sf-id][data-sf-role="isometric"]').forEach(node => {
    const id = node.getAttribute('data-sf-id');
    if (!id || excludeIds.has(id)) {
      return;
    }
    const geometry = isometricGeometryOf(node);
    const bounds = geometry?.bounds ?? node.getBBox();
    results.push({ id, apex: { x: bounds.x + (geometry?.depth ?? 0) * AXIS_COS, y: bounds.y } });
  });
  return results;
}

export function findSnapCandidateBounds(
  svg: SVGSVGElement,
  excludeIds: Set<string>,
): Array<{ x: number; y: number; width: number; height: number }> {
  const results: Array<{ x: number; y: number; width: number; height: number }> = [];
  svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary][data-sf-id]').forEach(node => {
    const id = node.getAttribute('data-sf-id');
    const role = node.getAttribute('data-sf-role');
    if (!id || role === 'link' || excludeIds.has(id)) {
      return;
    }
    const bbox = node.getBBox();
    results.push({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height });
  });
  return results;
}
