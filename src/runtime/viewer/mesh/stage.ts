import { type Mesh, type MeshAnchor, type MeshSurface, setMeshValue, type Vec3 } from '../../../model/mesh';
import { isCameraGesture } from '../../dom';
import { hideBaseGeometry, planeSurface } from '../shaders/createSurface';
import { shaderProgram } from '../shaders/programs';
import { uploadSurface } from '../shaders/renderSurface';
import { loadMeshAsset } from './glb';
import { modelMatrix, transformPoint } from './matrix';
import { type Camera, type MeshFrame, MeshRenderer, type Plane, type PlaneLayer } from './renderer';
import { rasterize, surfaceLayers } from './surfaceLayers';

export const MESH_STAGE_ATTR = 'data-sf-mesh-stage';
export const MESH_HANDLES_ATTR = 'data-sf-mesh-handles';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAX_PIXELS = 4096;
const DRAG_THRESHOLD = 4;
const ORBIT_PER_PIXEL = 0.5;
const SPIN_PER_PIXEL = 0.6;
const SCALE_PER_PIXEL = 0.006;
const OCCLUDED_OPACITY = '0.18';
const WORLD_UNIT = 100;
const MAX_SURFACE_LEVEL = 4;
const MAX_PITCH = 85;
const AXES: ReadonlyArray<{ name: string; axis: Vec3; color: string }> = [
  { name: 'x', axis: [1, 0, 0], color: '#e5484d' },
  { name: 'y', axis: [0, 1, 0], color: '#30a46c' },
  { name: 'z', axis: [0, 0, 1], color: '#3e63dd' },
];

export interface MeshHandleChange {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

export interface MeshStageEvents {
  select(id: string | null): void;
  change(id: string, change: MeshHandleChange): void;
  error(message: string): void;
}

export interface MeshStageOptions {
  interactive: boolean;
  // Says what address an asset is loaded from, or that it is not loaded at all.
  resolveAsset?: (asset: string) => string | null;
  events: MeshStageEvents;
}

export interface MeshStagesHandle {
  // The pictures of the stages in the order of the document, for exports.
  capture(): Array<string | undefined>;
  refresh(): void;
  setValue(meshId: string, property: string, value: number | string): boolean;
  clearValues(): void;
  objectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null;
  destroy(): void;
}

interface StageData {
  id: string;
  orbit: [number, number];
  shadow: boolean;
  meshes: Mesh[];
  surfaces?: Array<MeshSurface & { svg: string }>;
  anchors: MeshAnchor[];
}

type StageSurface = MeshSurface & { svg: string };

interface SurfaceState {
  svg: string;
  level: number;
  token: number;
  layers: PlaneLayer[];
}

// Asks for what lies on a Canvas under the pointer, among some ids, or where the pointer is on one that is being held.
export interface MeshObjectQuery {
  among?: ReadonlySet<string>;
  holding?: string;
}

// An object on a Canvas, and where on it the pointer is, as fractions of its width and height.
export interface MeshObjectPoint {
  id: string;
  x: number;
  y: number;
}

// A document names what it loads, so it stays on the ways a page normally loads a picture.
function defaultAsset(asset: string): string | null {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(asset)?.[1].toLowerCase();
  return !scheme || ['http', 'https', 'blob', 'data'].includes(scheme) ? asset : null;
}

function dataOf(host: Element): StageData | undefined {
  try {
    return JSON.parse(host.getAttribute(MESH_STAGE_ATTR) ?? '') as StageData;
  } catch {
    return undefined;
  }
}

// A drag on the stage would otherwise mark the texts it passes over.
const keepTextUnselected = (event: Event): void => event.preventDefault();

class MeshStage {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: MeshRenderer | null = null;
  private data: StageData = { id: '', orbit: [45, 27], shadow: false, meshes: [], anchors: [] };
  private written = '';
  private framedAssets = '';
  private frame: MeshFrame | undefined;
  private camera: Camera | undefined;
  private yaw = 45;
  private pitch = 27;
  private selected: string | null = null;
  private handles: SVGGElement | null = null;
  private readonly overrides = new Map<string, MeshHandleChange>();
  // Values that came from data while the drawing stayed as it was. They last until the data says otherwise.
  private readonly live = new Map<string, Map<string, number | string>>();
  private readonly errors = new Set<string>();
  private readonly surfaceStates = new Map<string, SurfaceState>();
  private readonly originals = new WeakMap<Element, { written: string; original: string | null }>();
  private readonly loading = new Set<string>();
  private request: number | undefined;
  private observer: ResizeObserver | undefined;
  private zoomObserver: MutationObserver | undefined;
  private destroyed = false;
  private gesture: { x: number; y: number; moved: boolean } | null = null;
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
      const previous = this.data.orbit;
      const data = dataOf(host);
      if (data) {
        this.data = data;
      }
      this.written = attribute;
      this.overrides.clear();
      if (previous[0] !== this.data.orbit[0] || previous[1] !== this.data.orbit[1] || !this.framedAssets) {
        [this.yaw, this.pitch] = this.data.orbit;
      }
    }
    if (!this.renderer) {
      return;
    }
    for (const asset of new Set(this.data.meshes.map(mesh => mesh.asset))) {
      this.load(asset);
    }
    // The update of the drawing has just put the objects back, so they are moved again before anything is painted.
    this.placeAnchors();
    this.schedule();
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
    this.surfaceStates.clear();
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
    }
  }

  private unbind(): void {
    this.host.removeEventListener('pointerdown', this.onPointerDown as EventListener);
    this.host.removeEventListener('mousedown', keepTextUnselected);
    this.host.removeEventListener('pointermove', this.onPointerMove as EventListener);
    this.host.removeEventListener('pointerup', this.onPointerUp as EventListener);
  }

  private load(asset: string): void {
    const renderer = this.renderer;
    if (!renderer || renderer.hasAsset(asset) || this.loading.has(asset)) {
      return;
    }
    const address = this.options.resolveAsset ? this.options.resolveAsset(asset) : defaultAsset(asset);
    if (address === null) {
      this.loading.add(asset);
      this.report(`${asset}: this address is not allowed`);
      return;
    }
    this.loading.add(asset);
    void loadMeshAsset(address)
      .then(async mesh => {
        if (this.destroyed || this.renderer !== renderer) {
          return;
        }
        renderer.addAsset(asset, mesh);
        this.framedAssets = '';
        this.schedule();
        await Promise.all(
          mesh.primitives.map(async (primitive, index) => {
            const { image } = primitive.material;
            if (!image) {
              return;
            }
            const blob = typeof image === 'string' ? await (await fetch(image)).blob() : image;
            const bitmap = await createImageBitmap(blob, {
              imageOrientation: 'none',
              premultiplyAlpha: 'none',
              colorSpaceConversion: 'none',
            });
            if (!this.destroyed && this.renderer === renderer) {
              renderer.setTexture(asset, index, bitmap);
            }
            bitmap.close();
          }),
        );
        this.schedule();
      })
      .catch((failure: unknown) => {
        this.report(`${asset}: ${failure instanceof Error ? failure.message : String(failure)}`);
      })
      .finally(() => this.loading.delete(asset));
  }

  private report(message: string): void {
    this.errors.add(message);
    this.host.setAttribute('data-sf-mesh-error', [...this.errors].join('; '));
    this.options.events.error(message);
  }

  private schedule(): void {
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

  private placed(): Mesh[] {
    return this.data.meshes.map(mesh => {
      const placed: Mesh = {
        ...mesh,
        position: [...mesh.position],
        rotation: [...mesh.rotation],
        scale: [...mesh.scale],
        ...this.overrides.get(mesh.id),
      };
      for (const [property, value] of this.live.get(mesh.id) ?? []) {
        setMeshValue(placed, property, value);
      }
      return placed;
    });
  }

  // Only the part of the stage on the screen is drawn, so it stays as sharp as the screen at any zoom.
  private draw(wholeStage = false): void {
    const { canvas, renderer } = this;
    if (!canvas || !renderer) {
      return;
    }
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
    const aspect = fullWidth / fullHeight;
    const window = [
      ((left - full.left) / fullWidth) * 2 - 1,
      1 - ((bottom - full.top) / fullHeight) * 2,
      ((right - full.left) / fullWidth) * 2 - 1,
      1 - ((top - full.top) / fullHeight) * 2,
    ] as const;
    const meshes = this.placed();
    const planes = this.planes(renderer);
    // The camera is framed when what stands on the stage changes, not when a mesh moves, so a mesh that moves is seen moving.
    const loaded = meshes.filter(mesh => renderer.hasAsset(mesh.asset));
    const framing = `${aspect.toFixed(2)}|${loaded.map(mesh => mesh.id).join('|')}|${planes.map(plane => plane.id).join('|')}`;
    if (framing !== this.framedAssets) {
      this.frame = renderer.frame(meshes, this.yaw, this.pitch, aspect, this.data.shadow, planes);
      this.framedAssets = framing;
    }
    this.camera = this.frame ? renderer.camera(this.frame, this.yaw, this.pitch, aspect, window) : undefined;
    this.keepSurfacesSharp(renderer, planes);
    renderer.draw(meshes, this.camera, { groundShadow: this.data.shadow, planes });
    this.placeAnchors();
    this.drawHandles();
    if (planes.some(plane => plane.layers.some(layer => 'rect' in layer))) {
      this.schedule();
    }
  }

  private placedSurfaces(): StageSurface[] {
    return (this.data.surfaces ?? []).map(surface => {
      const placed: StageSurface = {
        ...surface,
        position: [...surface.position],
        rotation: [...surface.rotation],
        scale: [...surface.scale],
        ...this.overrides.get(surface.id),
      };
      for (const [property, value] of this.live.get(surface.id) ?? []) {
        setMeshValue(placed, property, value);
      }
      return placed;
    });
  }

  private planes(renderer: MeshRenderer): Plane[] {
    return this.placedSurfaces().map(surface => {
      this.syncSurface(renderer, surface, this.surfaceStates.get(surface.id)?.level ?? 2);
      return { ...this.planeOf(surface), layers: this.surfaceStates.get(surface.id)?.layers ?? [] };
    });
  }

  // A surface brought near is drawn again with more pixels. It does not lose them when it goes away.
  private keepSurfacesSharp(renderer: MeshRenderer, planes: readonly Plane[]): void {
    const ratio = this.svg.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    const unit = this.svg.getScreenCTM()?.a || 1;
    const stageWidth = Number(this.host.getAttribute('width')) * unit * ratio;
    for (const surface of this.placedSurfaces()) {
      const plane = planes.find(item => item.id === surface.id);
      const a = plane && this.toStage(transformPoint(plane.matrix, [-1, 0, 0]));
      const b = plane && this.toStage(transformPoint(plane.matrix, [1, 0, 0]));
      const state = this.surfaceStates.get(surface.id);
      if (!a || !b || !state) {
        continue;
      }
      const stage = Number(this.host.getAttribute('width')) || 1;
      const pixels = (Math.hypot(b.x - a.x, b.y - a.y) / stage) * stageWidth;
      const wanted = Math.min(MAX_SURFACE_LEVEL, 2 ** Math.ceil(Math.log2(Math.max(1, pixels / surface.width))));
      if (wanted > state.level) {
        this.syncSurface(renderer, surface, wanted);
      }
    }
  }

  private syncSurface(renderer: MeshRenderer, surface: StageSurface, level: number): void {
    const known = this.surfaceStates.get(surface.id);
    if (known && known.svg === surface.svg && known.level === level) {
      return;
    }
    const state: SurfaceState = {
      svg: surface.svg,
      level,
      token: (known?.token ?? 0) + 1,
      layers: known?.layers ?? [],
    };
    this.surfaceStates.set(surface.id, state);
    const page = this.svg.ownerDocument;
    const current = () => !this.destroyed && this.renderer === renderer && this.surfaceStates.get(surface.id) === state;
    const gl = this.canvas?.getContext('webgl2');
    const canvas = this.canvas;
    void (async () => {
      const layers = await surfaceLayers(surface.svg, surface.width, surface.height, page, root => {
        for (const shader of root.querySelectorAll('foreignObject[data-sf-shader]')) {
          hideBaseGeometry(shader);
        }
      });
      const made: PlaneLayer[] = [];
      for (const layer of layers) {
        if ('svg' in layer) {
          const picture = await rasterize(
            layer.svg,
            Math.round(surface.width * level),
            Math.round(surface.height * level),
            page,
          );
          if (!current()) {
            return;
          }
          made.push({ texture: renderer.planeTexture(picture) });
        } else if (gl && canvas && renderer.planeBuffer) {
          const shaderLayer = this.shaderLayer(renderer, layer.shader, surface, level);
          if (shaderLayer) {
            made.push(shaderLayer);
          }
        }
      }
      if (!current()) {
        return;
      }
      for (const old of state.layers) {
        if ('texture' in old) {
          renderer.deleteTexture(old.texture);
        }
      }
      state.layers = made;
      this.schedule();
    })().catch((failure: unknown) => {
      this.report(`${surface.id}: ${failure instanceof Error ? failure.message : String(failure)}`);
    });
  }

  private shaderLayer(
    renderer: MeshRenderer,
    owner: Element,
    surface: StageSurface,
    level: number,
  ): PlaneLayer | undefined {
    const gl = this.canvas?.getContext('webgl2');
    const definition = shaderProgram(owner.getAttribute('data-sf-shader') ?? '');
    if (!gl || !this.canvas || !definition || !renderer.planeBuffer) {
      return undefined;
    }
    const program = renderer.linkPlane(definition.fragmentSource);
    const shader = planeSurface(
      owner,
      this.canvas,
      gl as unknown as WebGLRenderingContext,
      program,
      renderer.planeBuffer,
    );
    if (!shader) {
      return undefined;
    }
    const width = Number(owner.getAttribute('width'));
    const height = Number(owner.getAttribute('height'));
    return {
      program,
      rect: [
        Number(owner.getAttribute('x')) / surface.width,
        Number(owner.getAttribute('y')) / surface.height,
        width / surface.width,
        height / surface.height,
      ],
      upload: () => uploadSurface(shader, width * level, height * level, level, performance.now() / 1000),
    };
  }

  private stagePoint(clientX: number, clientY: number): [number, number] {
    const box = this.host.getBoundingClientRect();
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
    const planes = this.planes(renderer);
    for (const surface of this.placedSurfaces()) {
      const plane = planes.find(item => item.id === surface.id);
      const hit = plane && renderer.planeHit(camera, plane, x, y);
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
    const box = canvas.getBoundingClientRect();
    const mesh = renderer.meshDistance(
      this.placed(),
      camera,
      ((clientX - box.left) / box.width) * 2 - 1,
      1 - ((clientY - box.top) / box.height) * 2,
    );
    return mesh !== undefined && mesh < nearest.distance ? undefined : nearest;
  }

  objectAt(clientX: number, clientY: number, options: MeshObjectQuery = {}): MeshObjectPoint | null {
    const { camera, renderer } = this;
    if (!camera || !renderer) {
      return null;
    }
    const within = (value: number) => Math.min(1, Math.max(0, value));
    if (options.holding) {
      const surface = this.placedSurfaces().find(item => item.members.some(member => member.id === options.holding));
      const member = surface?.members.find(item => item.id === options.holding);
      const plane = surface && this.planes(renderer).find(item => item.id === surface.id);
      const [x, y] = this.stagePoint(clientX, clientY);
      const hit = plane && renderer.planeHit(camera, plane, x, y);
      if (!surface || !member || !hit) {
        return null;
      }
      return {
        id: member.id,
        x: within((hit.x * surface.width - member.x) / member.width),
        y: within((hit.y * surface.height - member.y) / member.height),
      };
    }
    const found = this.surfaceAt(clientX, clientY);
    if (!found) {
      return null;
    }
    const px = found.x * found.surface.width;
    const py = found.y * found.surface.height;
    const member = found.surface.members
      .filter(item => !options.among || options.among.has(item.id))
      .filter(item => px >= item.x && px <= item.x + item.width && py >= item.y && py <= item.y + item.height)
      .pop();
    return member ? { id: member.id, x: (px - member.x) / member.width, y: (py - member.y) / member.height } : null;
  }

  private planeOf(surface: StageSurface): Plane {
    return {
      id: surface.id,
      layers: [],
      matrix: modelMatrix(surface.position, surface.rotation, [
        (surface.width / WORLD_UNIT / 2) * surface.scale[0],
        (surface.height / WORLD_UNIT / 2) * surface.scale[1],
        surface.scale[2],
      ]),
    };
  }

  private handleBox(mesh: Mesh): { min: Vec3; max: Vec3 } | undefined {
    const surface = this.placedSurfaces().find(item => item.id === mesh.id);
    return surface ? this.renderer?.box([], [this.planeOf(surface)]) : this.renderer?.box([mesh]);
  }

  // A point of the 3D world in the units of the 2D drawing, from the corner of the stage.
  private toStage(point: readonly number[]): { x: number; y: number } | undefined {
    const projected = this.camera && this.renderer?.project(this.camera, point);
    if (!projected) {
      return undefined;
    }
    const width = Number(this.host.getAttribute('width'));
    const height = Number(this.host.getAttribute('height'));
    return { x: ((projected[0] + 1) / 2) * width, y: ((1 - projected[1]) / 2) * height };
  }

  private toDrawing(point: readonly number[]): { x: number; y: number } | undefined {
    const inStage = this.toStage(point);
    return (
      inStage && {
        x: inStage.x + Number(this.host.getAttribute('x')),
        y: inStage.y + Number(this.host.getAttribute('y')),
      }
    );
  }

  private placeAnchors(): void {
    if (!this.camera) {
      return;
    }
    const meshes = this.placed();
    for (const anchor of this.data.anchors) {
      const mesh = meshes.find(candidate => candidate.id === anchor.mesh);
      const world = mesh && transformPoint(modelMatrix(mesh.position, mesh.rotation, mesh.scale), anchor.point);
      const at = world && this.toStage(world);
      if (!at) {
        continue;
      }
      const hidden = Boolean(mesh && world && this.camera && this.renderer?.occluded(meshes, this.camera, world));
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

  private selectedMesh(): Mesh | undefined {
    const surface = this.placedSurfaces().find(item => item.id === this.selected);
    return surface
      ? {
          id: surface.id,
          asset: '',
          opacity: 1,
          position: surface.position,
          rotation: surface.rotation,
          scale: surface.scale,
        }
      : this.placed().find(mesh => mesh.id === this.selected);
  }

  private drawHandles(): void {
    const mesh = this.selectedMesh();
    const box = mesh && this.handleBox(mesh);
    const origin = mesh && this.toDrawing(mesh.position);
    if (!mesh || !box || !origin) {
      this.handles?.remove();
      this.handles = null;
      return;
    }
    const document = this.svg.ownerDocument;
    if (!this.handles) {
      this.handles = document.createElementNS(SVG_NAMESPACE, 'g') as SVGGElement;
      this.handles.setAttribute(MESH_HANDLES_ATTR, mesh.id);
      this.handles.addEventListener('pointerdown', this.onHandleDown as EventListener);
      this.handles.addEventListener('mousedown', keepTextUnselected);
    }
    if (!this.handles.isConnected) {
      this.svg.appendChild(this.handles);
    }
    const unit = 1 / (this.svg.getScreenCTM()?.a || 1);
    const parts: string[] = [];
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(index =>
      this.toDrawing([
        index & 1 ? box.max[0] : box.min[0],
        index & 2 ? box.max[1] : box.min[1],
        index & 4 ? box.max[2] : box.min[2],
      ]),
    );
    const edges = [0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7];
    let outline = '';
    for (let i = 0; i < edges.length; i += 2) {
      const [a, b] = [corners[edges[i]], corners[edges[i + 1]]];
      if (a && b) {
        outline += `M${a.x} ${a.y}L${b.x} ${b.y}`;
      }
    }
    parts.push(`<path d="${outline}" fill="none" stroke="#9b42df" stroke-width="${unit}" pointer-events="none"/>`);
    const length = this.axisLength(box);
    for (const { name, axis, color } of AXES) {
      const end = this.toDrawing(mesh.position.map((value, index) => value + axis[index] * length));
      if (!end) {
        continue;
      }
      parts.push(
        `<line x1="${origin.x}" y1="${origin.y}" x2="${end.x}" y2="${end.y}" stroke="transparent" stroke-width="${14 * unit}" data-mesh-axis="${name}" style="cursor:grab"/>`,
        `<line x1="${origin.x}" y1="${origin.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${3 * unit}" stroke-linecap="round" pointer-events="none"/>`,
        `<circle cx="${end.x}" cy="${end.y}" r="${5 * unit}" fill="${color}" pointer-events="none"/>`,
      );
    }
    const spin = this.toDrawing(mesh.position.map((value, index) => value + (index === 1 ? box.max[1] - value : 0)));
    if (spin) {
      parts.push(
        `<circle cx="${spin.x}" cy="${spin.y - 26 * unit}" r="${7 * unit}" fill="#ffffff" stroke="#9b42df" stroke-width="${2 * unit}" data-mesh-spin="true" style="cursor:ew-resize"/>`,
      );
    }
    const size = this.toDrawing(box.max);
    if (size) {
      parts.push(
        `<rect x="${size.x - 6 * unit}" y="${size.y - 6 * unit}" width="${12 * unit}" height="${12 * unit}" fill="#9b42df" stroke="#ffffff" stroke-width="${unit}" data-mesh-scale="true" style="cursor:nwse-resize"/>`,
      );
    }
    this.handles.innerHTML = parts.join('');
  }

  private axisLength(box: { min: Vec3; max: Vec3 }): number {
    return Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]) * 0.6;
  }

  private readonly onHandleDown = (event: PointerEvent): void => {
    const mesh = this.selectedMesh();
    const box = mesh && this.handleBox(mesh);
    const target = event.target as Element;
    const axisName = target.getAttribute('data-mesh-axis');
    const spinning = target.hasAttribute('data-mesh-spin');
    const scaling = target.hasAttribute('data-mesh-scale');
    if (!mesh || !box || event.button !== 0 || (!axisName && !spinning && !scaling)) {
      return;
    }
    event.stopPropagation();
    const view = this.svg.ownerDocument.defaultView;
    const scale = this.svg.getScreenCTM()?.a || 1;
    const startX = event.clientX;
    const startY = event.clientY;
    const id = mesh.id;
    const axis = AXES.find(item => item.name === axisName)?.axis;
    const length = this.axisLength(box);
    const from = this.toDrawing(mesh.position);
    const to = axis && this.toDrawing(mesh.position.map((value, index) => value + axis[index] * length));
    const screen = from && to ? { x: (to.x - from.x) * scale, y: (to.y - from.y) * scale } : undefined;
    const reach = screen ? Math.hypot(screen.x, screen.y) || 1 : 1;
    let change: MeshHandleChange = {};
    const move = (next: PointerEvent) => {
      const [dx, dy] = [next.clientX - startX, next.clientY - startY];
      if (scaling) {
        const factor = Math.max(0.05, 1 + (dx - dy) * SCALE_PER_PIXEL);
        change = { scale: mesh.scale.map(value => value * factor) as Vec3 };
      } else if (spinning) {
        change = { rotation: [mesh.rotation[0], mesh.rotation[1] + dx * SPIN_PER_PIXEL, mesh.rotation[2]] };
      } else if (axis && screen) {
        const along = ((dx * screen.x + dy * screen.y) / (reach * reach)) * length;
        change = { position: mesh.position.map((value, index) => value + axis[index] * along) as Vec3 };
      }
      this.overrides.set(id, { ...this.overrides.get(id), ...change });
      this.schedule();
    };
    const up = () => {
      view?.removeEventListener('pointermove', move);
      view?.removeEventListener('pointerup', up);
      if (change.position || change.rotation || change.scale) {
        this.options.events.change(id, change);
      }
    };
    view?.addEventListener('pointermove', move);
    view?.addEventListener('pointerup', up);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || isCameraGesture(event)) {
      return;
    }
    this.gesture = { x: event.clientX, y: event.clientY, moved: false };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
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
    this.yaw -= dx * ORBIT_PER_PIXEL;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dy * ORBIT_PER_PIXEL));
    this.schedule();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    const { camera, renderer, canvas } = this;
    this.gesture = null;
    if (!gesture || gesture.moved || !camera || !renderer || !canvas) {
      return;
    }
    const box = canvas.getBoundingClientRect();
    const hit = renderer.pick(
      this.placed(),
      camera,
      ((event.clientX - box.left) / box.width) * 2 - 1,
      1 - ((event.clientY - box.top) / box.height) * 2,
    );
    this.select(this.surfaceAt(event.clientX, event.clientY)?.surface.id ?? hit);
  };

  hasMesh(id: string): boolean {
    return this.data.meshes.some(mesh => mesh.id === id) || Boolean(this.data.surfaces?.some(item => item.id === id));
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

  select(id: string | null): void {
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

class MeshStages implements MeshStagesHandle {
  private readonly stages = new Map<string, MeshStage>();
  private readonly pending = new Map<string, number | string>();
  private readonly svg: SVGSVGElement;
  private readonly options: MeshStageOptions;

  constructor(svg: SVGSVGElement, options: MeshStageOptions) {
    this.svg = svg;
    this.options = options;
    if (options.interactive) {
      svg.addEventListener('pointerdown', this.onPointerDown);
    }
    this.refresh();
  }

  private hosts(): Element[] {
    return [...this.svg.querySelectorAll(`foreignObject[${MESH_STAGE_ATTR}]`)];
  }

  refresh(): void {
    const seen = new Set<string>();
    for (const host of this.hosts()) {
      const id = dataOf(host)?.id;
      if (!id) {
        continue;
      }
      seen.add(id);
      const stage = this.stages.get(id);
      if (stage) {
        stage.update(host);
      } else {
        this.stages.set(id, new MeshStage(host, this.svg, this.options));
      }
    }
    for (const [id, stage] of this.stages) {
      if (!seen.has(id)) {
        stage.destroy();
        this.stages.delete(id);
      }
    }
    this.applyPending();
  }

  // A press anywhere else lets go of the mesh that is selected.
  private readonly onPointerDown = (event: PointerEvent): void => {
    const target = event.target as Element | null;
    if (target?.closest(`[${MESH_HANDLES_ATTR}]`)) {
      return;
    }
    const inside = target?.closest(`foreignObject[${MESH_STAGE_ATTR}]`);
    for (const stage of this.stages.values()) {
      if (stage.element !== inside) {
        stage.select(null);
      }
    }
  };

  setValue(meshId: string, property: string, value: number | string): boolean {
    this.pending.set(`${meshId}\n${property}`, value);
    return this.applyPending();
  }

  // A value can come before the stage of its mesh is there, so it waits for it.
  private applyPending(): boolean {
    let found = false;
    for (const [key, value] of this.pending) {
      const [id, property] = key.split('\n');
      for (const stage of this.stages.values()) {
        if (stage.hasMesh(id)) {
          stage.setValue(id, property, value);
          this.pending.delete(key);
          found = true;
        }
      }
    }
    return found;
  }

  clearValues(): void {
    this.pending.clear();
    for (const stage of this.stages.values()) {
      stage.clearValues();
    }
  }

  objectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null {
    for (const stage of this.stages.values()) {
      const found = stage.objectAt(clientX, clientY, options);
      if (found) {
        return found;
      }
    }
    return null;
  }

  capture(): Array<string | undefined> {
    return this.hosts().map(host => this.stages.get(dataOf(host)?.id ?? '')?.capture());
  }

  destroy(): void {
    this.svg.removeEventListener('pointerdown', this.onPointerDown);
    for (const stage of this.stages.values()) {
      stage.destroy();
    }
    this.stages.clear();
  }
}

export function mountMeshStages(svg: SVGSVGElement, options: MeshStageOptions): MeshStagesHandle {
  return new MeshStages(svg, options);
}
