// Small DOM-only lookups shared by the viewer's own interaction (selection
// overlay) and by `stickyflow/interaction` (text edit) — both need to find an
// owner's primary/text node and its on-screen rect. (DOM code — no jsdom here,
// browser-verified like the rest of viewer/interaction.ts and display.ts.)

/** First descendant of `svg` sharing `data-sf-id="id"` that satisfies `predicate`. */
export function findOwnerNode(svg: SVGSVGElement, id: string, predicate: (el: Element) => boolean): SVGGraphicsElement | null {
  const nodes = svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"]`);
  for (const el of nodes) if (predicate(el)) return el as unknown as SVGGraphicsElement;
  return null;
}

/** Every descendant of `svg` sharing `data-sf-id="id"` — a shape's body plus
 *  its label plus any extra sub-shapes (e.g. a cylinder's cap ellipses), so a
 *  drag can move all of them together, not just the primary node. */
export function findAllOwnerNodes(svg: SVGSVGElement, id: string): SVGGraphicsElement[] {
  return Array.from(svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"]`)) as unknown as SVGGraphicsElement[];
}

export const isPrimary = (el: Element): boolean => el.hasAttribute('data-sf-primary');
export const isTextLabel = (el: Element): boolean => el.tagName.toLowerCase() === 'text' && !el.hasAttribute('data-sf-primary');

/** An element's box in viewport pixels, accounting for the current pan/zoom. */
export function screenRectOf(el: SVGGraphicsElement): { left: number; top: number; width: number; height: number } {
  const bbox = el.getBBox();
  const ctm = el.getScreenCTM();
  if (!ctm) return { left: 0, top: 0, width: 0, height: 0 };
  const topLeft = new DOMPoint(bbox.x, bbox.y).matrixTransform(ctm);
  const bottomRight = new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(ctm);
  return { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}
