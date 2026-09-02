export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Owner ids added/removed/changed by a single updateContent() call, at owner
 *  granularity (data-sf-id — one owner is often several top-level SVG
 *  elements, e.g. a frame's body + tab + title text) rather than raw element
 *  id. Consumed by the `sceneDiff` viewer event and change-highlighting. */
export interface SceneDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

export interface DisplayHandle {
  readonly svg: SVGSVGElement;
  fit(): void;
  getViewport(): ViewBox;
  zoomBy(factor: number, clientX?: number, clientY?: number): void;
  panBy(dxPixels: number, dyPixels: number): void;
  updateContent(svgString: string): SceneDiff;
  destroy(): void;
}
