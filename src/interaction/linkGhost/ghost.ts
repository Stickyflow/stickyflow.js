import { pxPerUnit, SVG_NAMESPACE } from '../../domContract';
import type { Rect } from '../../model/geometry/types';

export const GHOST_FREE_STROKE = '#727272';
export const GHOST_SNAPPED_STROKE = '#992dff';
const GHOST_OPACITY = '0.7';
const GHOST_DASH_PX = 6;
const ANCHOR_RADIUS_PX = 6;
const ANCHOR_OUTLINE_PX = 2;
const ANCHOR_OPACITY = '0.9';
const RESTORED_ATTRIBUTES = ['stroke', 'stroke-dasharray', 'stroke-linecap', 'opacity'] as const;

export class LinkGhost {
  readonly #svg: SVGSVGElement;
  readonly #path: SVGPathElement;
  readonly #saved = new Map<string, string | null>();
  readonly #anchors: SVGGElement;
  #shown = false;

  constructor(svg: SVGSVGElement, path: SVGPathElement) {
    this.#svg = svg;
    this.#path = path;
    this.#anchors = svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'g');
    this.#anchors.setAttribute('data-sf-link-target', '');
    this.#anchors.setAttribute('pointer-events', 'none');
  }

  show(snapped: boolean, targetBounds: Rect | null): void {
    if (!this.#shown) {
      this.#shown = true;
      for (const name of RESTORED_ATTRIBUTES) {
        this.#saved.set(name, this.#path.getAttribute(name));
      }
      const dash = GHOST_DASH_PX / pxPerUnit(this.#svg);
      this.#path.setAttribute('stroke-dasharray', `${dash} ${dash}`);
      this.#path.setAttribute('stroke-linecap', 'round');
      this.#path.setAttribute('opacity', GHOST_OPACITY);
      this.#svg.appendChild(this.#anchors);
    }
    this.#path.setAttribute('stroke', snapped ? GHOST_SNAPPED_STROKE : GHOST_FREE_STROKE);
    this.#drawAnchors(targetBounds);
  }

  hide(): void {
    this.#anchors.remove();
    if (!this.#shown) {
      return;
    }
    this.#shown = false;
    for (const [name, value] of this.#saved) {
      if (value === null) {
        this.#path.removeAttribute(name);
      } else {
        this.#path.setAttribute(name, value);
      }
    }
    this.#saved.clear();
  }

  #drawAnchors(bounds: Rect | null): void {
    this.#anchors.replaceChildren();
    if (!bounds) {
      return;
    }
    const unit = 1 / pxPerUnit(this.#svg);
    const centers: Array<[number, number]> = [
      [bounds.x + bounds.width / 2, bounds.y],
      [bounds.x + bounds.width, bounds.y + bounds.height / 2],
      [bounds.x + bounds.width / 2, bounds.y + bounds.height],
      [bounds.x, bounds.y + bounds.height / 2],
    ];
    for (const [cx, cy] of centers) {
      const dot = this.#svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'circle');
      dot.setAttribute('cx', String(cx));
      dot.setAttribute('cy', String(cy));
      dot.setAttribute('r', String(ANCHOR_RADIUS_PX * unit));
      dot.setAttribute('fill', GHOST_SNAPPED_STROKE);
      dot.setAttribute('stroke', '#ffffff');
      dot.setAttribute('stroke-width', String(ANCHOR_OUTLINE_PX * unit));
      dot.setAttribute('opacity', ANCHOR_OPACITY);
      this.#anchors.appendChild(dot);
    }
  }
}
