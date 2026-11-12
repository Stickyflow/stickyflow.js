import type { ShaderParameter } from '../../model/shader';
import { type DocumentComponentsHandle, mountDocumentComponents } from './components';
import { placeRulerKnobs, rulerProgress } from './components/rulerKnob';
import type { DisplayHandle, ViewBox } from './display';
import { mountDisplay } from './display';
import { Emitter, type OwnerRef, type Unsubscribe, type ViewerEventHandler, type ViewerEventName } from './events';
import { rasterizeSvgSnapshot, serializeSvgSnapshot, type ViewerImageExportOptions } from './export';
import { bindInteraction, type InteractionHandle } from './interaction';
import type {
  MeshCamera,
  MeshObjectPoint,
  MeshObjectQuery,
  MeshPoint,
  MeshPointQuery,
  MeshStageFlags,
} from './mesh/stage';
import { type MeshStagesHandle, mountMeshStages } from './mesh/stage';
import { mountShaderSurfaces, type ShaderSurfaceHandle } from './shaders';
import { assertViewerUpdateContract, renderViewerSource } from './source';
import type { Viewer, ViewerOptions, ViewerSource } from './types';

export class ViewerSession implements Viewer {
  private readonly emitter = new Emitter();
  private readonly display: DisplayHandle;
  private readonly interaction: InteractionHandle | null;
  private readonly shaderSurfaces: ShaderSurfaceHandle;
  private readonly meshStages: MeshStagesHandle;
  private readonly documentComponents: DocumentComponentsHandle;
  private readonly shaderParameterOverrides = new Map<string, Record<string, ShaderParameter>>();
  private readonly rulerProgressOverrides = new Map<string, number>();

  constructor(
    private readonly options: ViewerOptions,
    initialSvg: string,
    private readonly diagramId: string,
  ) {
    this.display = mountDisplay(options.container, initialSvg);
    this.shaderSurfaces = mountShaderSurfaces(this.display.svg);
    this.meshStages = mountMeshStages(this.display.svg, {
      interactive: Boolean(options.interactive),
      resolveAsset: options.resolveAsset,
      events: {
        select: id => this.emitter.emit('meshSelect', { diagramId, id }),
        change: (id, change) => this.emitter.emit('meshChange', { diagramId, id, ...change }),
        error: message => this.emitter.emit('meshError', { diagramId, message }),
        objectSelect: id => this.emitter.emit('meshObjectSelect', { diagramId, id }),
        objectChange: (id, box) => this.emitter.emit('meshObjectChange', { diagramId, id, ...box }),
      },
    });
    this.documentComponents = mountDocumentComponents(this.display.svg);
    this.interaction = options.interactive
      ? bindInteraction(this.display, this.emitter, diagramId, { selectable: options.selectable })
      : null;
    this.placeKnobs();
  }

  private placeKnobs(): void {
    const radii = placeRulerKnobs(this.display.svg, id => this.rulerProgressOverrides.get(id));
    for (const [id, knobRadius] of radii) {
      this.setShaderParameters(id, { knobRadius });
    }
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
    return serializeSvgSnapshot(this.svg, this.shaderSurfaces.capture(), this.meshStages.capture());
  }

  exportImage(options?: ViewerImageExportOptions): Promise<Blob> {
    return rasterizeSvgSnapshot(this.svg, this.exportSvg(), options);
  }

  setShaderParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean {
    const merged = { ...this.shaderParameterOverrides.get(ownerId), ...parameters };
    this.shaderParameterOverrides.set(ownerId, merged);
    return this.shaderSurfaces.setParameters(ownerId, parameters);
  }

  setWidgetValue(componentId: string, value: string | number): boolean {
    return this.setComponentValue(componentId, value);
  }

  setMeshGroup(ids: readonly string[]): void {
    this.meshStages.setFollowers(ids);
  }

  setMeshFlags(flags: MeshStageFlags): void {
    this.meshStages.setFlags(flags);
  }

  selectMeshItem(id: string | null): boolean {
    return this.meshStages.selectItem(id);
  }

  setMeshEditing(editing: boolean): void {
    this.meshStages.setEditing(editing);
  }

  setMeshSteadyCamera(steady: boolean): void {
    this.meshStages.setSteadyCamera(steady);
  }

  setMeshTracing(tracing: boolean): void {
    this.meshStages.setTracing(tracing);
  }

  setMeshDirectCamera(direct: boolean): void {
    this.meshStages.setDirectCamera(direct);
  }

  setMeshGrid(grid: boolean): void {
    this.meshStages.setGrid(grid);
  }

  meshObjectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null {
    return this.meshStages.objectAt(clientX, clientY, options);
  }

  meshPointAt(clientX: number, clientY: number, query?: MeshPointQuery): MeshPoint | null {
    return this.meshStages.pointAt(clientX, clientY, query);
  }

  meshCamera(): MeshCamera | null {
    return this.meshStages.camera();
  }

  setMeshCamera(camera: Partial<MeshCamera>, options?: { animate?: boolean }): void {
    this.meshStages.setCamera(camera, options?.animate ?? false);
  }

  meshPointOnScreen(point: { x: number; y: number; z: number }): { clientX: number; clientY: number } | null {
    const found = this.meshStages.screenOf([point.x, point.y, point.z]);
    return found && { clientX: found.x, clientY: found.y };
  }

  setMeshValue(meshId: string, property: string, value: number | string): boolean {
    return this.meshStages.setValue(meshId, property, value);
  }

  setComponentValue(componentId: string, value: string | number): boolean {
    if (this.documentComponents.setValue(componentId, value)) {
      return true;
    }
    const ruler = [...this.svg.querySelectorAll('foreignObject[data-sf-shader="ruler"]')].find(
      element => element.getAttribute('data-sf-id') === componentId,
    );
    if (ruler) {
      const progress = rulerProgress(ruler, Number(value));
      this.rulerProgressOverrides.set(componentId, progress);
      const applied = this.setShaderParameters(componentId, { progress });
      this.placeKnobs();
      return applied;
    }
    const scale = [...this.svg.querySelectorAll('foreignObject[data-sf-shader="tickScale"]')].find(
      element => element.getAttribute('data-sf-id') === componentId,
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
    return this.setShaderParameters(componentId, { progress: Math.min(1, Math.max(0, Number(value) / max)) });
  }

  setPaused(paused: boolean): void {
    this.shaderSurfaces.setPaused(paused);
  }

  clearOverrides(): void {
    this.shaderParameterOverrides.clear();
    this.rulerProgressOverrides.clear();
    this.documentComponents.clearValues();
    this.meshStages.clearValues();
  }

  update(next: ViewerSource): void {
    const svg = renderViewerSource(next, this.options.renderOptions);
    assertViewerUpdateContract(svg);
    const diff = this.display.updateContent(svg);
    this.shaderSurfaces.refresh();
    this.meshStages.refresh();
    this.documentComponents.refresh();
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
    this.meshStages.destroy();
    this.documentComponents.destroy();
    this.shaderParameterOverrides.clear();
    this.display.destroy();
    this.emitter.clear();
  }
}
