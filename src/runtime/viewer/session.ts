import type { ShaderParameter } from '../../model/shader';
import type { DisplayHandle, ViewBox } from './display';
import { mountDisplay } from './display';
import { Emitter, type OwnerRef, type Unsubscribe, type ViewerEventHandler, type ViewerEventName } from './events';
import { rasterizeSvgSnapshot, serializeSvgSnapshot, type ViewerImageExportOptions } from './export';
import { bindInteraction, type InteractionHandle } from './interaction';
import { mountShaderSurfaces, type ShaderSurfaceHandle } from './shaders';
import { assertViewerUpdateContract, renderViewerSource } from './source';
import type { Viewer, ViewerOptions, ViewerSource } from './types';
import { type DocumentWidgetsHandle, mountDocumentWidgets } from './widgets';
import { placeRulerKnobs, rulerProgress } from './widgets/rulerKnob';

export class ViewerSession implements Viewer {
  private readonly emitter = new Emitter();
  private readonly display: DisplayHandle;
  private readonly interaction: InteractionHandle | null;
  private readonly shaderSurfaces: ShaderSurfaceHandle;
  private readonly documentWidgets: DocumentWidgetsHandle;
  private readonly shaderParameterOverrides = new Map<string, Record<string, ShaderParameter>>();
  private readonly rulerProgressOverrides = new Map<string, number>();

  constructor(
    private readonly options: ViewerOptions,
    initialSvg: string,
    private readonly diagramId: string,
  ) {
    this.display = mountDisplay(options.container, initialSvg);
    this.shaderSurfaces = mountShaderSurfaces(this.display.svg);
    this.documentWidgets = mountDocumentWidgets(this.display.svg);
    this.interaction = options.interactive
      ? bindInteraction(this.display, this.emitter, diagramId, { selectable: options.selectable })
      : null;
    this.placeKnobs();
  }

  private placeKnobs(): void {
    placeRulerKnobs(this.display.svg, id => this.rulerProgressOverrides.get(id));
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
    this.interaction?.repaint();
  }

  getViewport(): ViewBox {
    return this.display.getViewport();
  }

  exportSvg(): string {
    return serializeSvgSnapshot(this.svg, this.shaderSurfaces.capture());
  }

  exportImage(options?: ViewerImageExportOptions): Promise<Blob> {
    return rasterizeSvgSnapshot(this.svg, this.exportSvg(), options);
  }

  setShaderParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean {
    const merged = { ...this.shaderParameterOverrides.get(ownerId), ...parameters };
    this.shaderParameterOverrides.set(ownerId, merged);
    return this.shaderSurfaces.setParameters(ownerId, parameters);
  }

  setWidgetValue(widgetId: string, value: string | number): boolean {
    if (this.documentWidgets.setValue(widgetId, value)) {
      return true;
    }
    const ruler = [...this.svg.querySelectorAll('foreignObject[data-sf-shader="ruler"]')].find(
      element => element.getAttribute('data-sf-id') === widgetId,
    );
    if (ruler) {
      const progress = rulerProgress(ruler, Number(value));
      this.rulerProgressOverrides.set(widgetId, progress);
      const applied = this.setShaderParameters(widgetId, { progress });
      this.placeKnobs();
      return applied;
    }
    // A tick scale takes the value as progress along its max.
    const scale = [...this.svg.querySelectorAll('foreignObject[data-sf-shader="tickScale"]')].find(
      element => element.getAttribute('data-sf-id') === widgetId,
    );
    if (!scale) {
      return false;
    }
    let max = 100;
    try {
      max = Number((JSON.parse(scale.getAttribute('data-sf-shader-params') ?? '{}') as { max?: number }).max) || 100;
    } catch {
      max = 100;
    }
    return this.setShaderParameters(widgetId, { progress: Math.min(1, Math.max(0, Number(value) / max)) });
  }

  clearOverrides(): void {
    this.shaderParameterOverrides.clear();
    this.rulerProgressOverrides.clear();
    this.documentWidgets.clearValues();
  }

  update(next: ViewerSource): void {
    const svg = renderViewerSource(next, this.options.renderOptions);
    assertViewerUpdateContract(svg);
    const diff = this.display.updateContent(svg);
    this.shaderSurfaces.refresh();
    this.documentWidgets.refresh();
    this.placeKnobs();
    for (const [ownerId, parameters] of this.shaderParameterOverrides) {
      this.shaderSurfaces.setParameters(ownerId, parameters);
    }
    if (next.resetView) {
      this.display.fit();
    }
    const selectedIds = this.interaction?.getSelection().map(owner => owner.id) ?? [];
    if (selectedIds.length > 0) {
      this.interaction?.select(selectedIds);
    }
    this.emitter.emit('sceneDiff', { diagramId: this.diagramId, ...diff });
    if (next.highlightChanges) {
      const color = typeof next.highlightChanges === 'object' ? next.highlightChanges.color : undefined;
      this.interaction?.flashChanged([...diff.added, ...diff.changed], color);
    }
  }

  announceReady(): void {
    queueMicrotask(() => this.emitter.emit('ready', { diagramId: this.diagramId }));
  }

  destroy(): void {
    this.interaction?.destroy();
    this.shaderSurfaces.destroy();
    this.documentWidgets.destroy();
    this.shaderParameterOverrides.clear();
    this.display.destroy();
    this.emitter.clear();
  }
}
