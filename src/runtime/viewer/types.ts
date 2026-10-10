import type { RenderOptions } from '../../render';
import type { ViewBox } from './display';
import type { OwnerRef, Unsubscribe, ViewerEventHandler, ViewerEventName } from './events';
import type { ViewerImageExportOptions } from './export';

export interface ViewerOptions {
  container: HTMLElement;
  source?: string;
  svg?: string;
  interactive?: boolean;
  selectable?: boolean;
  diagramId?: string;
  renderOptions?: RenderOptions;
}

export interface ViewerSource {
  source?: string;
  svg?: string;
  renderOptions?: RenderOptions;
  resetView?: boolean;
  highlightChanges?: boolean | { color?: string };
}

export interface Viewer {
  readonly svg: SVGSVGElement;
  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe;
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  fit(): void;
  getViewport(): ViewBox;
  exportSvg(): string;
  exportImage(options?: ViewerImageExportOptions): Promise<Blob>;
  update(next: ViewerSource): void;
  destroy(): void;
}
