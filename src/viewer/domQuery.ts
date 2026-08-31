export function findOwnerNode(
  svg: SVGSVGElement,
  id: string,
  predicate: (el: Element) => boolean,
): SVGGraphicsElement | null {
  const nodes = svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"]`);
  for (const el of nodes) if (predicate(el)) return el as unknown as SVGGraphicsElement;
  return null;
}

export function findAllOwnerNodes(svg: SVGSVGElement, id: string): SVGGraphicsElement[] {
  return Array.from(svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"]`)) as unknown as SVGGraphicsElement[];
}

export const isPrimary = (el: Element): boolean => el.hasAttribute('data-sf-primary');
export const isTextLabel = (el: Element): boolean =>
  el.tagName.toLowerCase() === 'text' && !el.hasAttribute('data-sf-primary');

export function screenRectOf(el: SVGGraphicsElement): { left: number; top: number; width: number; height: number } {
  const bbox = el.getBBox();
  const ctm = el.getScreenCTM();
  if (!ctm) return { left: 0, top: 0, width: 0, height: 0 };
  const topLeft = new DOMPoint(bbox.x, bbox.y).matrixTransform(ctm);
  const bottomRight = new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(ctm);
  return { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}

export function pxPerUnit(svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect();
  const viewBoxWidth = svg.viewBox.baseVal.width;
  return rect.width > 0 && viewBoxWidth > 0 ? rect.width / viewBoxWidth : 1;
}

export function findSnapCandidateBounds(
  svg: SVGSVGElement,
  excludeIds: Set<string>,
): Array<{ x: number; y: number; width: number; height: number }> {
  const results: Array<{ x: number; y: number; width: number; height: number }> = [];
  svg.querySelectorAll('[data-sf-primary][data-sf-id]').forEach(node => {
    const id = node.getAttribute('data-sf-id');
    const role = node.getAttribute('data-sf-role');
    if (!id || role === 'link' || excludeIds.has(id)) return;
    const bbox = (node as unknown as SVGGraphicsElement).getBBox();
    results.push({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height });
  });
  return results;
}
