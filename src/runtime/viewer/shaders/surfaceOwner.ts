const owners = new WeakMap<HTMLCanvasElement, Element>();

// A canvas that was taken out of the drawing still belongs to the surface it was written in.
export function setCanvasOwner(canvas: HTMLCanvasElement, owner: Element): void {
  owners.set(canvas, owner);
}

export function ownerOfCanvas(canvas: HTMLCanvasElement): Element | null {
  return owners.get(canvas) ?? canvas.closest('[data-sf-shader]');
}

export function drawingOfCanvas(canvas: HTMLCanvasElement): SVGSVGElement | null {
  return ownerOfCanvas(canvas)?.closest('svg') ?? null;
}
