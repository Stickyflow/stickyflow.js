export function pointerUserY(svg: SVGSVGElement, event: PointerEvent): number {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return 0;
  }
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse()).y;
}
