import type { ViewBox } from './types';

export class ViewportController {
  readonly #svg: SVGSVGElement;
  #natural: ViewBox;
  #view: ViewBox;

  constructor(svg: SVGSVGElement, natural: ViewBox) {
    this.#svg = svg;
    this.#natural = natural;
    this.#view = { ...natural };
  }

  apply(): void {
    this.#svg.setAttribute('viewBox', `${this.#view.x} ${this.#view.y} ${this.#view.w} ${this.#view.h}`);
  }

  fit(): void {
    this.#view = { ...this.#natural };
    this.apply();
  }

  get(): ViewBox {
    return { ...this.#view };
  }

  setNatural(natural: ViewBox): void {
    this.#natural = natural;
  }

  #userPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const matrix = this.#svg.getScreenCTM();
    if (!matrix) {
      return null;
    }
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  zoomBy(factor: number, clientX?: number, clientY?: number): void {
    const rect = this.#svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const centerX = clientX ?? rect.left + rect.width / 2;
    const centerY = clientY ?? rect.top + rect.height / 2;
    const anchor = this.#userPoint(centerX, centerY);
    this.#view = { ...this.#view, w: this.#view.w / factor, h: this.#view.h / factor };
    this.apply();
    const moved = anchor ? this.#userPoint(centerX, centerY) : null;
    if (anchor && moved) {
      this.#view.x += anchor.x - moved.x;
      this.#view.y += anchor.y - moved.y;
    }
    this.apply();
  }

  panBy(dxPixels: number, dyPixels: number): void {
    const scale = this.#svg.getScreenCTM()?.a;
    const pixelsPerUnit = scale && scale > 0 ? scale : 1;
    this.#view.x -= dxPixels / pixelsPerUnit;
    this.#view.y -= dyPixels / pixelsPerUnit;
    this.apply();
  }
}
