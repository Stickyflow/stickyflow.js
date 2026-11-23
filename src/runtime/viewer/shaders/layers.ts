import { setCanvasOwner } from './surfaceOwner';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SURFACE = 'foreignObject[data-sf-shader]';
const CANVAS = 'canvas[data-sf-shader-canvas]';

let made = 0;

// Some browsers draw a canvas inside a drawing at the wrong place, in the wrong size and over everything that follows it. All
// browsers on an iPhone do, and Safari.
export function drawsCanvasInDrawingWrongly(view: Window | null): boolean {
  const agent = view?.navigator?.userAgent ?? '';
  return /AppleWebKit/.test(agent) && !/Chrome|Chromium|Edg\//.test(agent);
}

function setStyle(element: HTMLElement | SVGElement, property: string, value: string): void {
  if (element.style.getPropertyValue(property) !== value) {
    element.style.setProperty(property, value);
  }
}

function copyOf(element: Element): Element {
  const copy = element.cloneNode(true) as Element;
  for (const node of [copy, ...copy.querySelectorAll('[id],[tabindex]')]) {
    node.removeAttribute('id');
    node.removeAttribute('tabindex');
  }
  return copy;
}

// The outline a surface is cut to, as a path in the units of the drawing.
function clipOf(owner: Element): string {
  const id = /url\(#([^)]+)\)/.exec(owner.getAttribute('clip-path') ?? '')?.[1];
  const shape = id ? owner.ownerDocument.getElementById(id)?.firstElementChild : null;
  const d = shape?.tagName.toLowerCase() === 'path' ? shape.getAttribute('d') : null;
  return d ? `path("${d}")` : 'none';
}

interface Layer {
  frame: HTMLDivElement;
  canvas: HTMLCanvasElement;
}

// The canvases of the shader surfaces, taken out of the drawing and laid under it at their places. What the drawing has under a
// surface is shown as a copy under its canvas, and hidden in the drawing itself, where it still takes the pointer. What lies
// over the last surface stays in the drawing. So everything keeps its order, and no canvas is inside a drawing.
export class SurfaceLayers {
  private readonly token = String(++made);
  private readonly host: HTMLDivElement;
  private readonly view: HTMLDivElement;
  private readonly rule: HTMLStyleElement;
  private readonly layers = new Map<Element, Layer>();
  private readonly observer: MutationObserver | undefined;
  private slices: SVGSVGElement[] = [];
  private order: Element[] = [];
  private stale = true;

  constructor(private readonly svg: SVGSVGElement) {
    const page = svg.ownerDocument;
    this.host = page.createElement('div');
    this.host.setAttribute('data-sf-shader-layers', this.token);
    this.host.setAttribute('aria-hidden', 'true');
    this.host.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    this.view = page.createElement('div');
    this.view.style.cssText = 'position:absolute;overflow:hidden';
    this.host.append(this.view);
    this.rule = page.createElement('style');
    page.head.append(this.rule);
    const Observer = page.defaultView?.MutationObserver;
    this.observer = Observer
      ? new Observer(records => {
          // The viewport moves the drawing as a whole, which the copies follow without being made again.
          if (records.some(record => record.target !== svg || record.type !== 'attributes')) {
            this.stale = true;
          }
        })
      : undefined;
    this.observer?.observe(svg, { subtree: true, childList: true, attributes: true, characterData: true });
  }

  private owners(): Element[] {
    return [...this.svg.children].filter(child => child.matches(SURFACE));
  }

  // Takes the canvases that came with the drawing, and lets go of those whose surface left it.
  adopt(): void {
    const owners = new Set(this.owners());
    for (const [owner, layer] of this.layers) {
      if (!owners.has(owner)) {
        layer.frame.remove();
        this.layers.delete(owner);
      }
    }
    for (const owner of owners) {
      const canvas = owner.querySelector<HTMLCanvasElement>(CANVAS);
      if (!canvas) {
        continue;
      }
      canvas.remove();
      if (this.layers.has(owner)) {
        continue;
      }
      const frame = this.svg.ownerDocument.createElement('div');
      frame.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;transform-origin:0 0';
      canvas.style.position = 'absolute';
      frame.append(canvas);
      setCanvasOwner(canvas, owner);
      this.layers.set(owner, { frame, canvas });
    }
    this.stale = true;
  }

  // The canvases in the order of their surfaces in the drawing.
  canvases(): HTMLCanvasElement[] {
    return this.owners().flatMap(owner => this.layers.get(owner)?.canvas ?? []);
  }

  // Puts every canvas and every copy where the drawing is right now.
  place(): void {
    const parent = this.svg.parentElement;
    if (!parent) {
      return;
    }
    if (this.host.parentElement !== parent || this.host.nextElementSibling !== this.svg) {
      parent.insertBefore(this.host, this.svg);
    }
    // An update writes the attributes of the drawing anew, so the mark the rule goes by is set again.
    if (this.svg.getAttribute('data-sf-layered') !== this.token) {
      this.svg.setAttribute('data-sf-layered', this.token);
    }
    const origin = this.host.getBoundingClientRect();
    const box = this.svg.getBoundingClientRect();
    setStyle(this.view, 'left', `${box.left - origin.left}px`);
    setStyle(this.view, 'top', `${box.top - origin.top}px`);
    setStyle(this.view, 'width', `${box.width}px`);
    setStyle(this.view, 'height', `${box.height}px`);
    if (this.stale) {
      this.copy();
    }
    for (const slice of this.slices) {
      for (const name of ['viewBox', 'preserveAspectRatio']) {
        const value = this.svg.getAttribute(name);
        if (value === null) {
          slice.removeAttribute(name);
        } else if (slice.getAttribute(name) !== value) {
          slice.setAttribute(name, value);
        }
      }
    }
    for (const [owner, { frame, canvas }] of this.layers) {
      const matrix = (owner as SVGGraphicsElement).getScreenCTM?.();
      if (!matrix) {
        continue;
      }
      const { a, b, c, d, e, f } = matrix;
      setStyle(frame, 'transform', `matrix(${a},${b},${c},${d},${e - box.left},${f - box.top})`);
      setStyle(frame, 'clip-path', clipOf(owner));
      for (const [property, attribute] of [
        ['left', 'x'],
        ['top', 'y'],
        ['width', 'width'],
        ['height', 'height'],
      ]) {
        setStyle(canvas, property, `${Number(owner.getAttribute(attribute)) || 0}px`);
      }
    }
  }

  private copy(): void {
    this.stale = false;
    const page = this.svg.ownerDocument;
    const order: Element[] = [];
    const under: Element[][] = [[]];
    let last = 0;
    [...this.svg.children].forEach((child, index) => {
      if (this.layers.has(child)) {
        order.push(child);
        under.push([]);
        last = index + 1;
      } else if (!child.matches(SURFACE) && !['defs', 'style'].includes(child.tagName.toLowerCase())) {
        under[under.length - 1].push(child);
      }
    });
    if (order.length !== this.order.length || order.some((owner, index) => owner !== this.order[index])) {
      this.order = order;
      this.slices = order.map(() => {
        const slice = page.createElementNS(SVG_NAMESPACE, 'svg') as SVGSVGElement;
        slice.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
        return slice;
      });
      this.view.replaceChildren(
        ...order.flatMap((owner, index) => [this.slices[index], (this.layers.get(owner) as Layer).frame]),
      );
    }
    this.slices.forEach((slice, index) => {
      slice.replaceChildren(...under[index].map(copyOf));
    });
    // The drawing lies over the layers. What has a copy under a canvas is not shown a second time by it.
    const drawing = `svg[data-sf-layered="${this.token}"]`;
    const hidden = last > 0 ? `${drawing} > :nth-child(-n+${last}) { opacity: 0 !important; }` : '';
    this.rule.textContent = `${drawing} { position: relative; } ${hidden}`;
  }

  destroy(): void {
    this.observer?.disconnect();
    this.host.remove();
    this.rule.remove();
    this.svg.removeAttribute('data-sf-layered');
  }
}
