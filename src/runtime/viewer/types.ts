import type { ShaderParameter } from '../../model/shader';
import type { RenderOptions } from '../../render';
import type { ViewBox } from './display';
import type { OwnerRef, Unsubscribe, ViewerEventHandler, ViewerEventName } from './events';
import type { ViewerImageExportOptions } from './export';
import type { MeshObjectPoint, MeshObjectQuery, MeshStageFlags } from './mesh/stage';

export interface ViewerOptions {
  container: HTMLElement;
  source?: string;
  svg?: string;
  interactive?: boolean;
  selectable?: boolean;
  diagramId?: string;
  renderOptions?: RenderOptions;
  // Decides what address the asset of a Mesh is loaded from, or null to not load it.
  resolveAsset?: (asset: string) => string | null;
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
  setShaderParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean;
  setComponentValue(componentId: string, value: string | number): boolean;
  setMeshValue(meshId: string, property: string, value: number | string): boolean;
  // Off, a Scene is only looked at and used: no selection and no handles.
  setMeshEditing(editing: boolean): void;
  // What layers have hidden or locked in a Scene, by name. Meshes and what lies on a Canvas are not in the drawing, so CSS does not reach them.
  setMeshFlags(flags: MeshStageFlags): void;
  // Selects a mesh, a Canvas or what lies on one. False when no Scene has that name.
  selectMeshItem(id: string | null): boolean;
  meshObjectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null;
  setWidgetValue(componentId: string, value: string | number): boolean;
  setPaused(paused: boolean): void;
  clearOverrides(): void;
  update(next: ViewerSource): void;
  destroy(): void;
}
