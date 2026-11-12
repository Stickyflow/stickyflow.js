import { type Box, rayAt } from './camera';
import { lightingOf } from './lighting';
import { transformPoint } from './matrix';
import { MeshRenderer, type Plane } from './renderer';
import { StageAnchors } from './stageAnchors';
import { StageGestures } from './stageGestures';
import { StageHandles } from './stageHandles';
import { StageLoader } from './stageLoader';
import { objectUnder, type SurfaceHit, surfaceUnder, topmostAt } from './stagePicking';
import { StagePlacement } from './stagePlacement';
import {
  dataOf,
  MESH_STAGE_ATTR,
  type MeshObjectPoint,
  type MeshObjectQuery,
  type MeshPoint,
  type MeshPointQuery,
  type MeshStageFlags,
  type MeshStageOptions,
} from './stageTypes';
import { pointIn, StageView } from './stageView';
import { SurfaceTextures, surfaceMatrix } from './surfaceTextures';

const CAMERA_TURN_MS = 380;
const EMPTY_SCENE: Box = { min: [-2, 0, -2], max: [2, 2, 2] };

// One Scene of a drawing: it owns the canvas and the renderer, and puts together what the parts work out. What stands on it is
// kept by the placement, the camera by the view, and loading, the pointer, the handles and the anchors each by a part of their own.

export class MeshStage {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: MeshRenderer | null = null;
  private textures: SurfaceTextures | null = null;
  private written = '';
  private selected: string | null = null;
  private selectedObject: string | null = null;
  // Without editing the world is only looked at and used: nothing is selected and there are no handles.
  private editing = true;
  private grid = false;
  private tracing = true;
  private readonly errors = new Set<string>();
  private turning: number | undefined;
  private request: number | undefined;
  private observer: ResizeObserver | undefined;
  private zoomObserver: MutationObserver | undefined;
  private destroyed = false;
  private readonly svg: SVGSVGElement;
  private readonly options: MeshStageOptions;
  private host: Element;
  private readonly placement = new StagePlacement();
  private readonly view: StageView;
  private readonly anchors: StageAnchors;
  private readonly loader: StageLoader;
  private readonly gestures: StageGestures;
  private readonly handles: StageHandles;

  constructor(host: Element, svg: SVGSVGElement, options: MeshStageOptions) {
    this.host = host;
    this.svg = svg;
    this.options = options;
    this.view = new StageView(host, svg);
    this.anchors = new StageAnchors(svg);
    this.loader = new StageLoader({
      resolveAsset: options.resolveAsset,
      alive: renderer => !this.destroyed && this.renderer === renderer,
      report: message => this.report(message),
      arrived: reframe => {
        if (reframe) {
          this.view.reframe();
          this.releaseUnused();
        }
        this.schedule();
      },
    });
    const changed = () => this.schedule();
    const click = (clientX: number, clientY: number) => this.clickAt(clientX, clientY);
    this.gestures = new StageGestures({ view: this.view, changed, click });
    this.handles = new StageHandles({
      svg,
      view: this.view,
      placement: this.placement,
      events: options.events,
      renderer: () => this.renderer,
      selected: () => this.selected,
      selectedObject: () => this.selectedObject,
      changed,
      click,
    });
    this.update(host);
  }

  get element(): Element {
    return this.host;
  }

  update(host: Element): void {
    if (host !== this.host) {
      this.gestures.unbind(this.host);
      this.host = host;
      this.view.host = host;
    }
    const canvas = host.querySelector('canvas');
    if (canvas !== this.canvas) {
      this.release();
      this.canvas = canvas;
      if (canvas) {
        this.start(canvas);
      }
    }
    const attribute = host.getAttribute(MESH_STAGE_ATTR) ?? '';
    if (attribute !== this.written) {
      this.takeData(host, attribute);
    }
    const { renderer } = this;
    if (!renderer) {
      return;
    }
    for (const asset of new Set(this.placement.data.meshes.map(mesh => mesh.asset))) {
      this.loader.asset(renderer, asset);
    }
    this.loader.environmentOf(renderer, this.placement.data.environment ?? '');
    this.releaseUnused();
    // The update of the drawing has just put the objects back, so they are moved again before anything is painted.
    this.placeAnchors();
    this.schedule();
  }

  private takeData(host: Element, attribute: string): void {
    const previous = this.placement.data.orbit;
    const data = dataOf(host) ?? this.placement.data;
    this.placement.take(data);
    this.written = attribute;
    this.handles.dropDraft();
    this.textures?.keepOnly(new Set((data.surfaces ?? []).map(surface => surface.id)));
    if (previous[0] !== data.orbit[0] || previous[1] !== data.orbit[1] || !this.view.hasFramed) {
      this.view.lookFrom(data.orbit);
    }
  }

  private start(canvas: HTMLCanvasElement): void {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      this.host.setAttribute('data-sf-mesh-error', 'WebGL2 is not available');
      return;
    }
    this.renderer = new MeshRenderer(gl);
    this.renderer.tracing = this.tracing;
    this.textures = new SurfaceTextures(
      this.renderer,
      canvas,
      () => this.schedule(),
      message => this.report(message),
    );
    this.view.reframe();
    if (typeof ResizeObserver === 'function') {
      this.observer = new ResizeObserver(() => this.schedule());
      this.observer.observe(canvas);
      this.observer.observe(this.svg);
    }
    // A zoom changes what is seen without changing the size of anything.
    if (typeof MutationObserver === 'function') {
      this.zoomObserver = new MutationObserver(() => this.schedule());
      this.zoomObserver.observe(this.svg, { attributes: true, attributeFilter: ['viewBox'] });
    }
    if (this.options.interactive) {
      this.gestures.bind(this.host);
    }
  }

  private report(message: string): void {
    this.errors.add(message);
    this.host.setAttribute('data-sf-mesh-error', [...this.errors].join('; '));
    this.options.events.error(message);
  }

  // Everything that changes what stands on the stage comes through here.
  private schedule(): void {
    this.placement.invalidate();
    if (this.request !== undefined || this.destroyed) {
      return;
    }
    const view = this.svg.ownerDocument.defaultView;
    if (!view) {
      return;
    }
    this.request = view.requestAnimationFrame(() => {
      this.request = undefined;
      this.draw();
    });
  }

  private planes(): Plane[] {
    return this.placement.get().surfaces.map(surface => ({
      id: surface.id,
      matrix: surfaceMatrix(surface),
      layers: this.textures?.layers(surface, this.placement.hiddenIds) ?? [],
    }));
  }

  private draw(wholeStage = false): void {
    const { canvas, renderer, view } = this;
    if (!canvas || !renderer) {
      return;
    }
    const { data } = this.placement;
    const { aspect, window } = view.fit(canvas, wholeStage);
    const { meshes, light } = this.placement.get();
    const lighting = lightingOf(light);
    const planes = this.planes();
    // Hiding something is no reason to move the camera, so the framing counts all that the document has.
    const framing = `${aspect.toFixed(2)}|${data.meshes
      .filter(mesh => renderer.hasAsset(mesh.asset))
      .map(mesh => mesh.id)
      .join('|')}|${(data.surfaces ?? []).map(surface => surface.id).join('|')}`;
    const shadowFrom = data.shadow ? lighting.direction : undefined;
    // A Scene with nothing in it still has a camera, so its ground shows and a point of it can be asked for.
    const empty = data.meshes.length === 0 ? EMPTY_SCENE : undefined;
    view.aim(framing, aspect, window, () => renderer.box(meshes, planes) ?? empty, shadowFrom);
    this.keepSurfacesSharp(planes);
    // A surface with a shader changes every frame, so its picture cannot be refined over several.
    const moving = planes.some(plane => plane.layers.some(layer => 'rect' in layer));
    const more = renderer.draw(meshes, view.camera, {
      shadows: data.shadow,
      planes,
      lighting,
      grid: this.grid && !wholeStage,
      environmentTurn: data.environmentTurn,
      exposure: data.exposure,
      ground: data.ground,
      still: !wholeStage && !this.gestures.active && !moving,
    });
    this.placeAnchors();
    this.handles.draw(this.editing);
    if (moving || more) {
      this.schedule();
    }
  }

  private keepSurfacesSharp(planes: readonly Plane[]): void {
    const ratio = this.svg.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    const unit = (this.svg.getScreenCTM()?.a || 1) * ratio;
    for (const surface of this.placement.get().surfaces) {
      const plane = planes.find(item => item.id === surface.id);
      const a = plane && this.view.toStage(transformPoint(plane.matrix, [-1, 0, 0]));
      const b = plane && this.view.toStage(transformPoint(plane.matrix, [1, 0, 0]));
      if (a && b) {
        this.textures?.sharpen(surface, Math.hypot(b.x - a.x, b.y - a.y) * unit);
      }
    }
  }

  private placeAnchors(): void {
    const { camera } = this.view;
    const { meshes } = this.placement.get();
    this.anchors.place(this.placement.data.anchors, meshes, camera, this.view.toStage.bind(this.view), world =>
      Boolean(camera && this.renderer?.occluded(meshes, camera, world)),
    );
  }

  private canvasPoint(clientX: number, clientY: number): [number, number] {
    return pointIn((this.canvas as HTMLCanvasElement).getBoundingClientRect(), clientX, clientY);
  }

  // The nearest surface under a point of the screen, unless a mesh stands in front of it.
  private surfaceAt(clientX: number, clientY: number): SurfaceHit | undefined {
    const { renderer, canvas } = this;
    const { camera } = this.view;
    if (!camera || !renderer || !canvas) {
      return undefined;
    }
    const { meshes, surfaces } = this.placement.get();
    return surfaceUnder(camera, surfaces, this.view.stagePoint(clientX, clientY), () =>
      renderer.meshDistance(meshes, camera, ...this.canvasPoint(clientX, clientY)),
    );
  }

  objectAt(clientX: number, clientY: number, options: MeshObjectQuery = {}): MeshObjectPoint | null {
    const point = this.view.stagePoint(clientX, clientY);
    return objectUnder(this.view.camera, this.placement.get().surfaces, point, options, () =>
      this.surfaceAt(clientX, clientY),
    );
  }

  pointAt(clientX: number, clientY: number, query: MeshPointQuery = {}): MeshPoint | null {
    const { renderer, canvas } = this;
    const { camera } = this.view;
    const [x, y] = this.view.stagePoint(clientX, clientY);
    if (!camera || Math.abs(x) > 1 || Math.abs(y) > 1) {
      return null;
    }
    const { origin, direction } = rayAt(camera, x, y);
    const along = (t: number) => ({
      x: origin[0] + direction[0] * t,
      y: origin[1] + direction[1] * t,
      z: origin[2] + direction[2] * t,
    });
    if (query.height !== undefined) {
      const t = Math.abs(direction[1]) < 1e-9 ? -1 : (query.height - origin[1]) / direction[1];
      return t > 0 ? along(t) : null;
    }
    if (!renderer || !canvas) {
      return null;
    }
    const { meshes } = this.placement.get();
    const distance = renderer.meshDistance(meshes, camera, ...this.canvasPoint(clientX, clientY));
    const mesh = renderer.pick(meshes, camera, ...this.canvasPoint(clientX, clientY));
    return distance === undefined ? null : { ...along(distance), ...(mesh ? { mesh } : {}) };
  }

  screenOf(point: readonly number[]): { x: number; y: number } | null {
    return this.view.toClient(point) ?? null;
  }

  private clickAt(clientX: number, clientY: number): void {
    const { renderer, canvas } = this;
    const { camera } = this.view;
    if (!camera || !renderer || !canvas || !this.editing) {
      return;
    }
    const found = this.surfaceAt(clientX, clientY);
    if (!found) {
      const hit = renderer.pick(this.placement.get().meshes, camera, ...this.canvasPoint(clientX, clientY));
      this.select(hit && !this.placement.isLocked(hit) ? hit : null);
      return;
    }
    const { surface } = found;
    if (this.placement.isLocked(surface.id)) {
      this.select(null);
      return;
    }
    // The first click takes the Canvas, the next what lies on it.
    const open = this.selected === surface.id || surface.members.some(member => member.id === this.selectedObject);
    if (open) {
      const free = { ...surface, members: surface.members.filter(member => !this.placement.isLocked(member.id)) };
      this.selectObject(topmostAt(free, found.x * surface.width, found.y * surface.height)?.id ?? null);
    } else {
      this.select(surface.id);
    }
  }

  hasMesh(id: string): boolean {
    return this.placement.has(id);
  }

  setValue(id: string, property: string, value: number | string): void {
    this.placement.setValue(id, property, value);
    this.schedule();
  }

  clearValues(): void {
    this.placement.clearValues();
    this.schedule();
  }

  setFlags(flags: MeshStageFlags): void {
    this.placement.setFlags(flags);
    for (const id of [this.selected, this.selectedObject]) {
      if (id && this.placement.isOutOfReach(id)) {
        this.select(null);
      }
    }
    this.schedule();
  }

  // Whether this stage has the name, as a mesh, a Canvas, what lies on one, or itself.
  selectItem(id: string): boolean {
    const { data } = this.placement;
    if (id === data.id || id === data.light?.id) {
      this.select(null);
      return true;
    }
    if (this.placement.has(id)) {
      this.select(id);
      return true;
    }
    const surface = this.placement.surfaceWith(id);
    if (!surface) {
      return false;
    }
    this.select(surface.id);
    this.selectObject(id);
    return true;
  }

  setEditing(editing: boolean): void {
    this.editing = editing;
    if (!editing) {
      this.select(null);
    }
    this.schedule();
  }

  setGrid(grid: boolean): void {
    this.grid = grid;
    this.schedule();
  }

  setDirectCamera(direct: boolean): void {
    this.gestures.direct = direct;
  }

  camera(): { orbit: [number, number]; target: [number, number, number] } | undefined {
    return this.view.pose;
  }

  // Turns the camera to another side or another point. Animated, it goes there in a short while, the shorter way round.
  setCamera(to: { orbit?: readonly [number, number]; target?: readonly number[] }, animate: boolean): void {
    const from = this.view.pose;
    const window = this.svg.ownerDocument.defaultView;
    if (!from || !window) {
      return;
    }
    if (this.turning !== undefined) {
      window.cancelAnimationFrame(this.turning);
      this.turning = undefined;
    }
    const orbit = to.orbit ?? from.orbit;
    const target = to.target ?? from.target;
    if (!animate) {
      this.view.place(orbit, target);
      this.schedule();
      return;
    }
    const turn = ((((orbit[0] - from.orbit[0]) % 360) + 540) % 360) - 180;
    const start = window.performance.now();
    const step = (): void => {
      const passed = Math.min(1, (window.performance.now() - start) / CAMERA_TURN_MS);
      const eased = 1 - (1 - passed) ** 3;
      this.view.place(
        [from.orbit[0] + turn * eased, from.orbit[1] + (orbit[1] - from.orbit[1]) * eased],
        from.target.map((value, axis) => value + (target[axis] - value) * eased),
      );
      this.schedule();
      this.turning = passed < 1 && !this.destroyed ? window.requestAnimationFrame(step) : undefined;
    };
    step();
  }

  setSteadyCamera(steady: boolean): void {
    this.view.steady = steady;
    if (!steady) {
      this.view.reframe();
    }
    this.schedule();
  }

  setTracing(tracing: boolean): void {
    this.tracing = tracing;
    if (this.renderer) {
      this.renderer.tracing = tracing;
    }
    this.schedule();
  }

  // Once every model of the document is there, the ones it no longer names are released.
  private releaseUnused(): void {
    const { renderer } = this;
    if (!renderer) {
      return;
    }
    const used = new Set(this.placement.data.meshes.map(mesh => mesh.asset));
    if ([...used].every(asset => renderer.hasAsset(asset))) {
      renderer.keepAssets(used);
    }
  }

  selectObject(id: string | null): void {
    if (id === this.selectedObject) {
      return;
    }
    this.selectedObject = id;
    this.handles.dropDraft();
    this.options.events.objectSelect(id);
    this.schedule();
  }

  select(id: string | null): void {
    this.selectObject(null);
    if (id === this.selected) {
      return;
    }
    this.selected = id;
    this.options.events.select(id);
    this.schedule();
  }

  capture(): string | undefined {
    if (!this.canvas || !this.renderer) {
      return undefined;
    }
    this.draw(true);
    const picture = this.canvas.toDataURL('image/png');
    this.draw();
    return picture;
  }

  private release(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.zoomObserver?.disconnect();
    this.zoomObserver = undefined;
    this.renderer?.destroy();
    this.renderer = null;
    this.loader.reset();
    this.textures = null;
    this.view.clear();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.turning !== undefined) {
      this.svg.ownerDocument.defaultView?.cancelAnimationFrame(this.turning);
    }
    if (this.request !== undefined) {
      this.svg.ownerDocument.defaultView?.cancelAnimationFrame(this.request);
    }
    this.gestures.unbind(this.host);
    this.handles.remove();
    this.release();
    this.canvas = null;
  }
}
