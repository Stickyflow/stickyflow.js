import { DEFAULT_LIGHT, type Mesh, type MeshLight, setMeshValue, type Vec3 } from '../../../model/mesh';
import { isCameraGesture } from '../../dom';
import {
  type Box,
  type Camera,
  FOV,
  frameBox,
  type MeshFrame,
  makeCamera,
  planeHit,
  project,
  type StageWindow,
} from './camera';
import { type EnvironmentImage, fromPixels, parseHdr, STUDIO, studioEnvironment } from './environment';
import { draggedBox, handleDrag, type MeshObjectBox, meshHandlesMarkup, objectOutlineMarkup } from './handles';
import { lightingOf } from './lighting';
import { loadAssetInto } from './loadAsset';
import { modelMatrix, transformPoint } from './matrix';
import { MeshRenderer, type Plane } from './renderer';
import {
  dataOf,
  MESH_HANDLES_ATTR,
  MESH_STAGE_ATTR,
  type MeshHandleChange,
  type MeshObjectPoint,
  type MeshObjectQuery,
  type MeshStageFlags,
  type MeshStageOptions,
  type Placement,
  type StageData,
} from './stageTypes';
import { type StageSurface, SurfaceTextures, surfaceMatrix } from './surfaceTextures';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAX_PIXELS = 4096;
const DRAG_THRESHOLD = 4;
const ORBIT_PER_PIXEL = 0.5;
const OCCLUDED_OPACITY = '0.18';
const MAX_PITCH = 85;

// A document names what it loads, so it stays on the ways a page normally loads a picture.
function defaultAsset(asset: string): string | null {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(asset)?.[1].toLowerCase();
  return !scheme || ['http', 'https', 'blob', 'data'].includes(scheme) ? asset : null;
}

const topmostAt = (surface: StageSurface, x: number, y: number) =>
  surface.members
    .filter(item => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height)
    .pop();

// Pictures of the world are kept for the page, as several stages often share one and making one takes a moment.
const environments = new Map<string, Promise<EnvironmentImage>>();

async function fetchEnvironment(address: string): Promise<EnvironmentImage> {
  const response = await fetch(address);
  if (!response.ok) {
    throw new Error(`${address}: ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  if (new Uint8Array(bytes, 0, 2).every((value, index) => value === '#?'.charCodeAt(index))) {
    return parseHdr(bytes);
  }
  const bitmap = await createImageBitmap(new Blob([bytes]), { colorSpaceConversion: 'none' });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('the picture could not be read');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return fromPixels(canvas.width, canvas.height, context.getImageData(0, 0, canvas.width, canvas.height).data);
}

function environmentFor(name: string, address: string): Promise<EnvironmentImage> {
  const key = name === STUDIO ? STUDIO : address;
  let known = environments.get(key);
  if (!known) {
    known = name === STUDIO ? Promise.resolve(studioEnvironment()) : fetchEnvironment(address);
    environments.set(key, known);
    known.catch(() => environments.delete(key));
  }
  return known;
}

// A drag on the stage would otherwise mark the texts it passes over.
const keepTextUnselected = (event: Event): void => event.preventDefault();

export class MeshStage {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: MeshRenderer | null = null;
  private textures: SurfaceTextures | null = null;
  private data: StageData = { id: '', orbit: [45, 27], shadow: false, meshes: [], anchors: [] };
  private written = '';
  private placement: Placement | null = null;
  private framedAssets = '';
  private frame: MeshFrame | undefined;
  private camera: Camera | undefined;
  private yaw = 45;
  private pitch = 27;
  // How much nearer or farther the camera is than the framing puts it, and how far it is moved sideways.
  private zoom = 1;
  private pan: [number, number, number] = [0, 0, 0];
  private selected: string | null = null;
  // Without editing the world is only looked at and used: nothing is selected and there are no handles.
  private editing = true;
  private grid = false;
  private selectedObject: string | null = null;
  private objectDraft: MeshObjectBox | null = null;
  private handles: SVGGElement | null = null;
  private readonly overrides = new Map<string, MeshHandleChange>();
  // Values that came from data while the drawing stayed as it was. They last until the data says otherwise.
  private readonly live = new Map<string, Map<string, number | string>>();
  private readonly errors = new Set<string>();
  private hidden: ReadonlySet<string> = new Set();
  private locked: ReadonlySet<string> = new Set();
  private readonly originals = new WeakMap<Element, { written: string; original: string | null }>();
  // Whether each anchored object is behind a mesh, for the view it was last worked out in.
  private readonly hiddenAnchors = new Map<string, boolean>();
  private anchorView = '';
  private readonly loading = new Set<string>();
  // The environment the renderer has, or is getting.
  private environment = '';
  private request: number | undefined;
  private observer: ResizeObserver | undefined;
  private zoomObserver: MutationObserver | undefined;
  private destroyed = false;
  private gesture: { x: number; y: number; moved: boolean; pan?: boolean } | null = null;
  private readonly svg: SVGSVGElement;
  private readonly options: MeshStageOptions;
  private host: Element;

  constructor(host: Element, svg: SVGSVGElement, options: MeshStageOptions) {
    this.host = host;
    this.svg = svg;
    this.options = options;
    this.update(host);
  }

  get element(): Element {
    return this.host;
  }

  update(host: Element): void {
    if (host !== this.host) {
      this.unbind();
      this.host = host;
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
    if (!this.renderer) {
      return;
    }
    for (const asset of new Set(this.data.meshes.map(mesh => mesh.asset))) {
      this.load(asset);
    }
    this.loadEnvironment();
    // The update of the drawing has just put the objects back, so they are moved again before anything is painted.
    this.placeAnchors();
    this.schedule();
  }

  private takeData(host: Element, attribute: string): void {
    const previous = this.data.orbit;
    this.data = dataOf(host) ?? this.data;
    this.written = attribute;
    this.objectDraft = null;
    this.overrides.clear();
    this.placement = null;
    this.textures?.keepOnly(new Set((this.data.surfaces ?? []).map(surface => surface.id)));
    if (previous[0] !== this.data.orbit[0] || previous[1] !== this.data.orbit[1] || !this.framedAssets) {
      [this.yaw, this.pitch] = this.data.orbit;
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
    this.textures = new SurfaceTextures(
      this.renderer,
      canvas,
      () => this.schedule(),
      message => this.report(message),
    );
    this.framedAssets = '';
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
      this.host.addEventListener('pointerdown', this.onPointerDown as EventListener);
      this.host.addEventListener('mousedown', keepTextUnselected);
      this.host.addEventListener('pointermove', this.onPointerMove as EventListener);
      this.host.addEventListener('pointerup', this.onPointerUp as EventListener);
      this.host.addEventListener('wheel', this.onWheel as EventListener, { passive: false });
    }
  }

  private unbind(): void {
    this.host.removeEventListener('pointerdown', this.onPointerDown as EventListener);
    this.host.removeEventListener('mousedown', keepTextUnselected);
    this.host.removeEventListener('pointermove', this.onPointerMove as EventListener);
    this.host.removeEventListener('pointerup', this.onPointerUp as EventListener);
    this.host.removeEventListener('wheel', this.onWheel as EventListener);
  }

  // Ctrl or Cmd with the wheel over a Scene, or a pinch, moves its camera nearer or farther. The page around it stays as it is. A wheel
  // made by a program, as when a page turns the plain wheel into its own zoom, is left to the page.
  private readonly onWheel = (event: WheelEvent): void => {
    if (!event.isTrusted || !isCameraGesture(event) || !this.frame) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.zoom = Math.min(4, Math.max(0.15, this.zoom * Math.exp(event.deltaY * 0.002)));
    this.schedule();
  };

  private load(asset: string): void {
    const renderer = this.renderer;
    if (!renderer || renderer.hasAsset(asset) || this.loading.has(asset)) {
      return;
    }
    const address = this.options.resolveAsset ? this.options.resolveAsset(asset) : defaultAsset(asset);
    this.loading.add(asset);
    if (address === null) {
      this.report(`${asset}: this address is not allowed`);
      return;
    }
    const alive = () => !this.destroyed && this.renderer === renderer;
    void loadAssetInto(renderer, asset, address, alive, () => {
      this.framedAssets = '';
      this.schedule();
    })
      .catch((failure: unknown) => {
        this.report(`${asset}: ${failure instanceof Error ? failure.message : String(failure)}`);
      })
      .finally(() => this.loading.delete(asset));
  }

  private loadEnvironment(): void {
    const renderer = this.renderer;
    const name = this.data.environment ?? '';
    if (!renderer || name === this.environment) {
      return;
    }
    this.environment = name;
    if (!name) {
      renderer.setEnvironment(null);
      this.schedule();
      return;
    }
    const address =
      name === STUDIO ? STUDIO : this.options.resolveAsset ? this.options.resolveAsset(name) : defaultAsset(name);
    if (address === null) {
      this.report(`${name}: this address is not allowed`);
      return;
    }
    environmentFor(name, address)
      .then(image => {
        if (!this.destroyed && this.renderer === renderer && this.environment === name) {
          renderer.setEnvironment(image);
          this.schedule();
        }
      })
      .catch((failure: unknown) => {
        this.report(`${name}: ${failure instanceof Error ? failure.message : String(failure)}`);
      });
  }

  private report(message: string): void {
    this.errors.add(message);
    this.host.setAttribute('data-sf-mesh-error', [...this.errors].join('; '));
    this.options.events.error(message);
  }

  // Everything that changes what stands on the stage comes through here.
  private schedule(): void {
    this.placement = null;
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

  private placedValues<T extends Mesh | StageSurface>(item: T): T {
    const placed: T = {
      ...item,
      position: [...item.position],
      rotation: [...item.rotation],
      scale: [...item.scale],
      ...this.overrides.get(item.id),
    };
    for (const [property, value] of this.live.get(item.id) ?? []) {
      setMeshValue(placed, property, value);
    }
    return placed;
  }

  private placedLight(): MeshLight {
    const light = { ...(this.data.light ?? DEFAULT_LIGHT) };
    for (const [property, value] of this.live.get(light.id) ?? []) {
      setMeshValue(light, property, value);
    }
    return this.hidden.has(light.id) ? { ...light, intensity: 0 } : light;
  }

  // A hidden Scene hides all that stands in it.
  private visible<T extends { id: string }>(items: readonly T[]): T[] {
    return this.hidden.has(this.data.id) ? [] : items.filter(item => !this.hidden.has(item.id));
  }

  private placed(): Placement {
    this.placement ??= {
      meshes: this.visible(this.data.meshes).map(mesh => this.placedValues(mesh)),
      surfaces: this.visible(this.data.surfaces ?? []).map(surface => ({
        ...this.placedValues(surface),
        members: surface.members.filter(member => !this.hidden.has(member.id)),
      })),
      light: this.placedLight(),
    };
    return this.placement;
  }

  private planes(): Plane[] {
    return this.placed().surfaces.map(surface => ({
      id: surface.id,
      matrix: surfaceMatrix(surface),
      layers: this.textures?.layers(surface, this.hidden) ?? [],
    }));
  }

  // Sets the canvas to the part of the stage on the screen, so it stays as sharp as the screen at any zoom.
  private fitCanvas(canvas: HTMLCanvasElement, wholeStage: boolean): { aspect: number; window: StageWindow } {
    const full = this.host.getBoundingClientRect();
    const page = this.svg.getBoundingClientRect();
    const fullWidth = Math.max(full.width, 1);
    const fullHeight = Math.max(full.height, 1);
    const left = wholeStage ? full.left : Math.max(full.left, page.left);
    const top = wholeStage ? full.top : Math.max(full.top, page.top);
    const right = Math.max(left + 1, wholeStage ? full.right : Math.min(full.right, page.right));
    const bottom = Math.max(top + 1, wholeStage ? full.bottom : Math.min(full.bottom, page.bottom));
    const ratio = canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    const scale = Math.min(ratio, MAX_PIXELS / Math.max(right - left, bottom - top));
    const width = Math.max(1, Math.round((right - left) * scale));
    const height = Math.max(1, Math.round((bottom - top) * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${((right - left) / fullWidth) * 100}%`;
    canvas.style.height = `${((bottom - top) / fullHeight) * 100}%`;
    // A margin in percent counts from the width, also at the top.
    canvas.style.marginLeft = `${((left - full.left) / fullWidth) * 100}%`;
    canvas.style.marginTop = `${((top - full.top) / fullWidth) * 100}%`;
    return {
      aspect: fullWidth / fullHeight,
      window: [
        ((left - full.left) / fullWidth) * 2 - 1,
        1 - ((bottom - full.top) / fullHeight) * 2,
        ((right - full.left) / fullWidth) * 2 - 1,
        1 - ((top - full.top) / fullHeight) * 2,
      ],
    };
  }

  private draw(wholeStage = false): void {
    const { canvas, renderer } = this;
    if (!canvas || !renderer) {
      return;
    }
    const { aspect, window } = this.fitCanvas(canvas, wholeStage);
    const { meshes, light } = this.placed();
    const lighting = lightingOf(light);
    const planes = this.planes();
    // The camera is framed when what stands on the stage changes, not when a mesh moves, so a mesh that moves is seen moving.
    // Hiding something is no reason to move the camera, so this counts all that the document has.
    const framing = `${aspect.toFixed(2)}|${this.data.meshes
      .filter(mesh => renderer.hasAsset(mesh.asset))
      .map(mesh => mesh.id)
      .join('|')}|${(this.data.surfaces ?? []).map(surface => surface.id).join('|')}`;
    if (framing !== this.framedAssets) {
      const box = renderer.box(meshes, planes);
      this.frame =
        box && frameBox(box, this.yaw, this.pitch, aspect, this.data.shadow ? lighting.direction : undefined);
      this.framedAssets = framing;
    }
    this.camera = this.frame
      ? makeCamera(
          {
            ...this.frame,
            center: this.frame.center.map((value, axis) => value + this.pan[axis]) as typeof this.frame.center,
            distance: this.frame.distance * this.zoom,
          },
          this.yaw,
          this.pitch,
          aspect,
          window,
        )
      : undefined;
    this.keepSurfacesSharp(planes);
    renderer.draw(meshes, this.camera, {
      shadows: this.data.shadow,
      planes,
      lighting,
      grid: this.grid && !wholeStage,
      environmentTurn: this.data.environmentTurn,
    });
    this.placeAnchors();
    this.drawHandles();
    if (planes.some(plane => plane.layers.some(layer => 'rect' in layer))) {
      this.schedule();
    }
  }

  private keepSurfacesSharp(planes: readonly Plane[]): void {
    const ratio = this.svg.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    const unit = (this.svg.getScreenCTM()?.a || 1) * ratio;
    for (const surface of this.placed().surfaces) {
      const plane = planes.find(item => item.id === surface.id);
      const a = plane && this.toStage(transformPoint(plane.matrix, [-1, 0, 0]));
      const b = plane && this.toStage(transformPoint(plane.matrix, [1, 0, 0]));
      if (a && b) {
        this.textures?.sharpen(surface, Math.hypot(b.x - a.x, b.y - a.y) * unit);
      }
    }
  }

  private stagePoint(clientX: number, clientY: number): [number, number] {
    const box = this.host.getBoundingClientRect();
    return [((clientX - box.left) / box.width) * 2 - 1, 1 - ((clientY - box.top) / box.height) * 2];
  }

  private canvasPoint(clientX: number, clientY: number): [number, number] {
    const box = (this.canvas as HTMLCanvasElement).getBoundingClientRect();
    return [((clientX - box.left) / box.width) * 2 - 1, 1 - ((clientY - box.top) / box.height) * 2];
  }

  // The nearest surface under a point of the screen, unless a mesh stands in front of it.
  private surfaceAt(clientX: number, clientY: number) {
    const { camera, renderer, canvas } = this;
    if (!camera || !renderer || !canvas) {
      return undefined;
    }
    const [x, y] = this.stagePoint(clientX, clientY);
    let nearest: { surface: StageSurface; distance: number; x: number; y: number } | undefined;
    for (const surface of this.placed().surfaces) {
      const hit = planeHit(camera, surfaceMatrix(surface), x, y);
      if (
        hit &&
        hit.x >= 0 &&
        hit.x <= 1 &&
        hit.y >= 0 &&
        hit.y <= 1 &&
        (!nearest || hit.distance < nearest.distance)
      ) {
        nearest = { surface, distance: hit.distance, x: hit.x, y: hit.y };
      }
    }
    if (!nearest) {
      return undefined;
    }
    const mesh = renderer.meshDistance(this.placed().meshes, camera, ...this.canvasPoint(clientX, clientY));
    return mesh !== undefined && mesh < nearest.distance ? undefined : nearest;
  }

  // A point of the screen on the plane of a surface, in its units, also beyond its edges.
  private surfacePoint(surface: StageSurface, clientX: number, clientY: number): { x: number; y: number } | undefined {
    if (!this.camera) {
      return undefined;
    }
    const hit = planeHit(this.camera, surfaceMatrix(surface), ...this.stagePoint(clientX, clientY));
    return hit && { x: hit.x * surface.width, y: hit.y * surface.height };
  }

  objectAt(clientX: number, clientY: number, options: MeshObjectQuery = {}): MeshObjectPoint | null {
    if (options.holding) {
      const { holding } = options;
      const surface = this.placed().surfaces.find(item => item.members.some(member => member.id === holding));
      const member = surface?.members.find(item => item.id === holding);
      const at = surface && this.surfacePoint(surface, clientX, clientY);
      if (!member || !at) {
        return null;
      }
      const within = (value: number) => Math.min(1, Math.max(0, value));
      return {
        id: member.id,
        x: within((at.x - member.x) / member.width),
        y: within((at.y - member.y) / member.height),
      };
    }
    const found = this.surfaceAt(clientX, clientY);
    if (!found) {
      return null;
    }
    const px = found.x * found.surface.width;
    const py = found.y * found.surface.height;
    const members = options.among
      ? { ...found.surface, members: found.surface.members.filter(item => options.among?.has(item.id)) }
      : found.surface;
    const member = topmostAt(members, px, py);
    return member ? { id: member.id, x: (px - member.x) / member.width, y: (py - member.y) / member.height } : null;
  }

  // A point of the 3D world in the units of the 2D drawing, from the corner of the stage.
  private toStage(point: readonly number[]): { x: number; y: number } | undefined {
    const projected = this.camera && project(this.camera, point);
    if (!projected) {
      return undefined;
    }
    const width = Number(this.host.getAttribute('width'));
    const height = Number(this.host.getAttribute('height'));
    return { x: ((projected[0] + 1) / 2) * width, y: ((1 - projected[1]) / 2) * height };
  }

  private readonly toDrawing = (point: readonly number[]): { x: number; y: number } | undefined => {
    const inStage = this.toStage(point);
    return (
      inStage && {
        x: inStage.x + Number(this.host.getAttribute('x')),
        y: inStage.y + Number(this.host.getAttribute('y')),
      }
    );
  };

  // Whether an anchor is behind a mesh only changes when the camera or a mesh moves, and asking costs a read from the GPU.
  private anchorHidden(id: string, meshes: readonly Mesh[], world: readonly number[]): boolean {
    const known = this.hiddenAnchors.get(id);
    if (known !== undefined) {
      return known;
    }
    const hidden = Boolean(this.camera && this.renderer?.occluded(meshes, this.camera, world));
    this.hiddenAnchors.set(id, hidden);
    return hidden;
  }

  private placeAnchors(): void {
    const { camera } = this;
    if (!camera || this.data.anchors.length === 0) {
      return;
    }
    const { meshes } = this.placed();
    const view = `${camera.eye.join()}|${camera.window.join()}|${meshes
      .map(mesh => `${mesh.position.join()}/${mesh.rotation.join()}/${mesh.scale.join()}/${mesh.asset}`)
      .join('|')}`;
    if (view !== this.anchorView) {
      this.anchorView = view;
      this.hiddenAnchors.clear();
    }
    for (const anchor of this.data.anchors) {
      const mesh = meshes.find(candidate => candidate.id === anchor.mesh);
      const world = mesh && transformPoint(modelMatrix(mesh.position, mesh.rotation, mesh.scale), anchor.point);
      const at = world && this.toStage(world);
      if (!world || !at) {
        continue;
      }
      const hidden = this.anchorHidden(anchor.objectId, meshes, world);
      for (const node of this.svg.querySelectorAll(`[data-sf-id="${CSS.escape(anchor.objectId)}"]`)) {
        const current = node.getAttribute('transform');
        const known = this.originals.get(node);
        const original = known && known.written === current ? known.original : current;
        const written = `translate(${at.x} ${at.y})${original ? ` ${original}` : ''}`;
        node.setAttribute('transform', written);
        this.originals.set(node, { written, original });
        (node as SVGElement).style.opacity = hidden ? OCCLUDED_OPACITY : '';
      }
    }
  }

  // The mesh or the Canvas with handles, as both move in the same way.
  private selectedItem(): { id: string; position: Vec3; rotation: Vec3; scale: Vec3; box: Box } | undefined {
    const { renderer, selected } = this;
    const { meshes, surfaces } = this.placed();
    const surface = surfaces.find(item => item.id === selected);
    const mesh = meshes.find(item => item.id === selected);
    const box = surface
      ? renderer?.box([], [{ id: surface.id, matrix: surfaceMatrix(surface), layers: [] }])
      : mesh && renderer?.box([mesh]);
    const item = surface ?? mesh;
    return item && box && { id: item.id, position: item.position, rotation: item.rotation, scale: item.scale, box };
  }

  private objectOnSurface(): { surface: StageSurface; box: MeshObjectBox } | undefined {
    const surface = this.placed().surfaces.find(item => item.members.some(member => member.id === this.selectedObject));
    const member = surface?.members.find(item => item.id === this.selectedObject);
    return surface && member ? { surface, box: this.objectDraft ?? member } : undefined;
  }

  private showHandles(id: string, markup: string): void {
    if (!this.handles) {
      this.handles = this.svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'g') as SVGGElement;
      this.handles.addEventListener('pointerdown', this.onHandleDown as EventListener);
      this.handles.addEventListener('mousedown', keepTextUnselected);
    }
    this.handles.setAttribute(MESH_HANDLES_ATTR, id);
    if (!this.handles.isConnected) {
      this.svg.appendChild(this.handles);
    }
    this.handles.innerHTML = markup;
  }

  private drawHandles(): void {
    const unit = 1 / (this.svg.getScreenCTM()?.a || 1);
    const onSurface = this.editing ? this.objectOnSurface() : undefined;
    if (onSurface) {
      const { surface, box } = onSurface;
      const matrix = surfaceMatrix(surface);
      const point = (x: number, y: number) =>
        this.toDrawing(transformPoint(matrix, [(x / surface.width) * 2 - 1, 1 - (y / surface.height) * 2, 0]));
      const markup = objectOutlineMarkup(box, point, unit);
      if (markup) {
        this.showHandles(surface.id, markup);
        return;
      }
    }
    const item = this.editing ? this.selectedItem() : undefined;
    const markup = item && meshHandlesMarkup(item.position, item.box, this.toDrawing, unit);
    if (item && markup) {
      this.showHandles(item.id, markup);
    } else {
      this.handles?.remove();
      this.handles = null;
    }
  }

  private dragObject(event: PointerEvent, part: string): void {
    const found = this.objectOnSurface();
    const id = this.selectedObject;
    const start = found && this.surfacePoint(found.surface, event.clientX, event.clientY);
    if (!found || !id || !start) {
      return;
    }
    event.stopPropagation();
    const view = this.svg.ownerDocument.defaultView;
    let moved = false;
    const move = (next: PointerEvent) => {
      const at = this.surfacePoint(found.surface, next.clientX, next.clientY);
      if (at) {
        const dx = Math.round(at.x - start.x);
        const dy = Math.round(at.y - start.y);
        moved = moved || dx !== 0 || dy !== 0;
        this.objectDraft = draggedBox(found.box, part, dx, dy);
        this.schedule();
      }
    };
    const up = () => {
      view?.removeEventListener('pointermove', move);
      view?.removeEventListener('pointerup', up);
      if (moved && this.objectDraft) {
        this.options.events.objectChange(id, this.objectDraft);
      }
    };
    view?.addEventListener('pointermove', move);
    view?.addEventListener('pointerup', up);
  }

  private readonly onHandleDown = (event: PointerEvent): void => {
    const target = event.target as Element;
    if (event.button !== 0) {
      return;
    }
    const objectPart = target.getAttribute('data-mesh-object');
    if (objectPart) {
      this.dragObject(event, objectPart);
      return;
    }
    const item = this.selectedItem();
    const changeFor = item && handleDrag(target, item, this.toDrawing, this.svg.getScreenCTM()?.a || 1);
    if (!item || !changeFor) {
      return;
    }
    event.stopPropagation();
    const view = this.svg.ownerDocument.defaultView;
    const { clientX: startX, clientY: startY } = event;
    let change: MeshHandleChange | undefined;
    const move = (next: PointerEvent) => {
      change = changeFor(next.clientX - startX, next.clientY - startY);
      this.overrides.set(item.id, { ...this.overrides.get(item.id), ...change });
      this.schedule();
    };
    const up = (last: PointerEvent) => {
      view?.removeEventListener('pointermove', move);
      view?.removeEventListener('pointerup', up);
      if (change) {
        this.options.events.change(item.id, change);
      } else {
        // A handle that was only clicked lets the click through to what lies under it.
        this.clickAt(last.clientX, last.clientY);
      }
    };
    view?.addEventListener('pointermove', move);
    view?.addEventListener('pointerup', up);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    // Ctrl or Cmd with a drag, or the middle button, moves the camera of the Scene sideways. The page around it stays.
    const pan = event.button === 1 || (event.button === 0 && isCameraGesture(event));
    if (event.button !== 0 && !pan) {
      return;
    }
    if (pan) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.gesture = { x: event.clientX, y: event.clientY, moved: false, pan };
    try {
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer that is gone already cannot be held.
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture) {
      return;
    }
    if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= DRAG_THRESHOLD) {
      return;
    }
    const [dx, dy] = gesture.moved ? [event.clientX - gesture.x, event.clientY - gesture.y] : [0, 0];
    gesture.moved = true;
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    if (gesture.pan) {
      event.stopPropagation();
      const { camera, frame } = this;
      if (!camera || !frame) {
        return;
      }
      // What a pixel spans at the distance of what the camera looks at.
      const height = this.host.getBoundingClientRect().height || 1;
      const perPixel = (2 * frame.distance * this.zoom * Math.tan(FOV / 2)) / height;
      this.pan = this.pan.map(
        (value, axis) => value - camera.right[axis] * dx * perPixel + camera.up[axis] * dy * perPixel,
      ) as [number, number, number];
      this.schedule();
      return;
    }
    this.yaw -= dx * ORBIT_PER_PIXEL;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dy * ORBIT_PER_PIXEL));
    this.schedule();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    this.gesture = null;
    if (gesture && !gesture.moved && !gesture.pan) {
      this.clickAt(event.clientX, event.clientY);
    }
  };

  private clickAt(clientX: number, clientY: number): void {
    const { camera, renderer, canvas } = this;
    if (!camera || !renderer || !canvas || !this.editing) {
      return;
    }
    const found = this.surfaceAt(clientX, clientY);
    if (!found) {
      const hit = renderer.pick(this.placed().meshes, camera, ...this.canvasPoint(clientX, clientY));
      this.select(hit && !this.locked.has(hit) ? hit : null);
      return;
    }
    const { surface } = found;
    if (this.locked.has(surface.id)) {
      this.select(null);
      return;
    }
    // The first click takes the Canvas, the next what lies on it.
    const open = this.selected === surface.id || surface.members.some(member => member.id === this.selectedObject);
    if (open) {
      const free = { ...surface, members: surface.members.filter(member => !this.locked.has(member.id)) };
      this.selectObject(topmostAt(free, found.x * surface.width, found.y * surface.height)?.id ?? null);
    } else {
      this.select(surface.id);
    }
  }

  hasMesh(id: string): boolean {
    return (
      this.data.meshes.some(mesh => mesh.id === id) ||
      this.data.light?.id === id ||
      Boolean(this.data.surfaces?.some(item => item.id === id))
    );
  }

  setValue(id: string, property: string, value: number | string): void {
    let values = this.live.get(id);
    if (!values) {
      values = new Map();
      this.live.set(id, values);
    }
    values.set(property, value);
    this.schedule();
  }

  clearValues(): void {
    this.live.clear();
    this.schedule();
  }

  setFlags({ hidden, locked }: MeshStageFlags): void {
    this.hidden = new Set(hidden);
    this.locked = new Set(locked);
    for (const id of [this.selected, this.selectedObject]) {
      if (id && (this.hidden.has(id) || this.locked.has(id))) {
        this.select(null);
      }
    }
    this.schedule();
  }

  // Whether this stage has the name, as a mesh, a Canvas, what lies on one, or itself.
  selectItem(id: string): boolean {
    if (id === this.data.id || id === this.data.light?.id) {
      this.select(null);
      return true;
    }
    if (this.hasMesh(id)) {
      this.select(id);
      return true;
    }
    const surface = this.data.surfaces?.find(item => item.members.some(member => member.id === id));
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

  selectObject(id: string | null): void {
    if (id === this.selectedObject) {
      return;
    }
    this.selectedObject = id;
    this.objectDraft = null;
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
    this.environment = '';
    this.textures = null;
    this.frame = undefined;
    this.camera = undefined;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.request !== undefined) {
      this.svg.ownerDocument.defaultView?.cancelAnimationFrame(this.request);
    }
    this.unbind();
    this.handles?.remove();
    this.release();
    this.canvas = null;
  }
}
