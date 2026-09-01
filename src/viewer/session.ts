import type { DisplayHandle, ViewBox } from './display';
import { mountDisplay } from './display';
import { Emitter, type OwnerRef, type Unsubscribe, type ViewerEventHandler, type ViewerEventName } from './events';
import { bindInteraction, type InteractionHandle } from './interaction';
import { assertViewerUpdateContract, renderViewerSource } from './source';
import type { Viewer, ViewerOptions, ViewerSource } from './types';

export class ViewerSession implements Viewer {
  private readonly emitter = new Emitter();
  private readonly display: DisplayHandle;
  private readonly interaction: InteractionHandle | null;

  constructor(
    private readonly options: ViewerOptions,
    initialSvg: string,
    private readonly diagramId: string,
  ) {
    this.display = mountDisplay(options.container, initialSvg);
    this.interaction = options.interactive
      ? bindInteraction(this.display, this.emitter, diagramId, { selectable: options.selectable })
      : null;
  }

  get svg(): SVGSVGElement {
    return this.display.svg;
  }

  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe {
    return this.emitter.on(name, handler);
  }

  getSelection(): OwnerRef[] {
    return this.interaction?.getSelection() ?? [];
  }

  select(ids: string[]): void {
    this.interaction?.select(ids);
  }

  fit(): void {
    this.display.fit();
  }

  getViewport(): ViewBox {
    return this.display.getViewport();
  }

  update(next: ViewerSource): void {
    const svg = renderViewerSource(next, this.options.renderOptions);
    assertViewerUpdateContract(svg);
    this.display.updateContent(svg);
    if (next.resetView) {
      this.display.fit();
    }
    const selectedIds = this.interaction?.getSelection().map(owner => owner.id) ?? [];
    if (selectedIds.length > 0) {
      this.interaction?.select(selectedIds);
    }
  }

  announceReady(): void {
    queueMicrotask(() => this.emitter.emit('ready', { diagramId: this.diagramId }));
  }

  destroy(): void {
    this.interaction?.destroy();
    this.display.destroy();
    this.emitter.clear();
  }
}
