import type { RenderOptions } from '../../render';
import type { ViewBox } from './display';
import type { OwnerRef, Unsubscribe, ViewerEventHandler, ViewerEventName } from './events';

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
  /**
   * update() only: briefly flash a ring/halo around whichever shapes this
   * update actually added or changed (see SceneDiff). Default false — a shared
   * library, so a new visual behavior is opt-in per call rather than silently
   * appearing for every existing consumer's update(). The `sceneDiff` event
   * fires either way, regardless of this flag. Pass `{ color }` instead of
   * `true` to override the default amber (CHANGE_COLOR in
   * runtime/dom/changeOverlay.ts) — e.g. a host that can tell a bulk rewrite
   * apart from an ordinary edit and wants a visually distinct flash.
   */
  highlightChanges?: boolean | { color?: string };
}

export interface Viewer {
  readonly svg: SVGSVGElement;
  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe;
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  fit(): void;
  getViewport(): ViewBox;
  update(next: ViewerSource): void;
  destroy(): void;
}
