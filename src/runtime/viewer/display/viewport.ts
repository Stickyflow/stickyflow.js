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

  zoomBy(factor: number, clientX?: number, clientY?: number): void {
    const rect = this.#svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const centerX = clientX ?? rect.left + rect.width / 2;
    const centerY = clientY ?? rect.top + rect.height / 2;
    const worldX = this.#view.x + ((centerX - rect.left) / rect.width) * this.#view.w;
    const worldY = this.#view.y + ((centerY - rect.top) / rect.height) * this.#view.h;
    this.#view = { w: this.#view.w / factor, h: this.#view.h / factor, x: 0, y: 0 };
    this.#view.x = worldX - ((centerX - rect.left) / rect.width) * this.#view.w;
    this.#view.y = worldY - ((centerY - rect.top) / rect.height) * this.#view.h;
    this.apply();
  }

  panBy(dxPixels: number, dyPixels: number): void {
    const rect = this.#svg.getBoundingClientRect();
    const pixelsPerUnit = rect.width > 0 ? rect.width / this.#view.w : 1;
    this.#view.x -= dxPixels / pixelsPerUnit;
    this.#view.y -= dyPixels / pixelsPerUnit;
    this.apply();
  }
}
