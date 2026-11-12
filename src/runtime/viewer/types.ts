import type { ShaderParameter } from '../../model/shader';
import type { RenderOptions } from '../../render';
import type { ViewBox } from './display';
import type { OwnerRef, Unsubscribe, ViewerEventHandler, ViewerEventName } from './events';
import type { ViewerImageExportOptions } from './export';
import type {
  MeshCamera,
  MeshObjectPoint,
  MeshObjectQuery,
  MeshPoint,
  MeshPointQuery,
  MeshStageFlags,
} from './mesh/stage';

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
  // A grid on the floor of a Scene while it is edited, as in a modeling program. It is never in an exported picture.
  setMeshGrid(grid: boolean): void;
  // For a Scene that fills its page: the wheel moves the camera nearer or farther without a key, and the right button moves it sideways.
  setMeshDirectCamera(direct: boolean): void;
  // Steady, the camera of a Scene keeps the frame it has when meshes come and go, as in a tool that builds a model step by step.
  // Turning it off frames the Scene again.
  setMeshSteadyCamera(steady: boolean): void;
  // Off, the still picture of a Scene with an environment is not traced, so a change shows at once. On again, it is traced.
  setMeshTracing(tracing: boolean): void;
  // Off, the picture of a Scene that is not traced, as while it moves, has no shadows of the environment. The traced one has.
  setMeshPlainShadows(on: boolean): void;
  // What layers have hidden or locked in a Scene, by name. Meshes and what lies on a Canvas are not in the drawing, so CSS does not reach them.
  setMeshFlags(flags: MeshStageFlags): void;
  // The meshes of a Scene that move together: dragging one of them takes the others along by the same step, while it is
  // dragged. The host is told of the one that was dragged. An empty list ends it.
  setMeshGroup(ids: readonly string[]): void;
  // Selects a mesh, a Canvas or what lies on one. False when no Scene has that name.
  selectMeshItem(id: string | null): boolean;
  meshObjectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null;
  // A point of the 3D world under a point of the screen, for drawing into a Scene: on the mesh there, or on a level plane.
  meshPointAt(clientX: number, clientY: number, query?: MeshPointQuery): MeshPoint | null;
  // Where a point of the 3D world is on the screen: the other way round. Null behind the camera.
  meshPointOnScreen(point: { x: number; y: number; z: number }): { clientX: number; clientY: number } | null;
  // Where the camera of the Scene looks from and at. Null before a Scene is drawn.
  meshCamera(): MeshCamera | null;
  // Turns the camera of a Scene to another side, to another point, or both. With `animate` it goes there in a short while.
  setMeshCamera(camera: Partial<MeshCamera>, options?: { animate?: boolean }): void;
  setWidgetValue(componentId: string, value: string | number): boolean;
  setPaused(paused: boolean): void;
  clearOverrides(): void;
  update(next: ViewerSource): void;
  destroy(): void;
}
