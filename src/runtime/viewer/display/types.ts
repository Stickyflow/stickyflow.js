export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
