export function pointerUserY(svg: SVGSVGElement, event: PointerEvent): number {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return 0;
  }
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse()).y;
}

// The pointer coordinate along the value axis: x for horizontal bars, y otherwise.
export function pointerAlongValueAxis(svg: SVGSVGElement, event: PointerEvent, horizontal: boolean | undefined): number {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return 0;
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  return horizontal ? point.x : point.y;
}
