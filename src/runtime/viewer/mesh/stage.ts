import type { Mesh, MeshAnchor, Vec3 } from '../../../model/mesh';
import { isCameraGesture } from '../../dom';
import { loadMeshAsset } from './glb';
import { modelMatrix, transformPoint } from './matrix';
import { type Camera, type MeshFrame, MeshRenderer } from './renderer';

export const MESH_STAGE_ATTR = 'data-sf-mesh-stage';
export const MESH_HANDLES_ATTR = 'data-sf-mesh-handles';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAX_PIXELS = 2048;
const DRAG_THRESHOLD = 4;
const ORBIT_PER_PIXEL = 0.5;
const SPIN_PER_PIXEL = 0.6;
const MAX_PITCH = 85;
const AXES: ReadonlyArray<{ name: string; axis: Vec3; color: string }> = [
  { name: 'x', axis: [1, 0, 0], color: '#e5484d' },
  { name: 'y', axis: [0, 1, 0], color: '#30a46c' },
  { name: 'z', axis: [0, 0, 1], color: '#3e63dd' },
];

export interface MeshStageEvents {
  select(id: string | null): void;
  change(id: string, change: { position?: Vec3; rotation?: Vec3 }): void;
}

export interface MeshStageOptions {
  interactive: boolean;
  events: MeshStageEvents;
}

export interface MeshStagesHandle {
  // The pictures of the stages in the order of the document, for exports.
  capture(): Array<string | undefined>;
  refresh(): void;
  destroy(): void;
}

interface StageData {
  id: string;
  orbit: [number, number];
  meshes: Mesh[];
  anchors: MeshAnchor[];
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
  private data: StageData = { id: '', orbit: [45, 27], meshes: [], anchors: [] };
  private written = '';
  private framedAssets = '';
  private frame: MeshFrame | undefined;
  private camera: Camera | undefined;
  private yaw = 45;
  private pitch = 27;
  private selected: string | null = null;
  private handles: SVGGElement | null = null;
  private readonly overrides = new Map<string, { position?: Vec3; rotation?: Vec3 }>();
  private readonly originals = new WeakMap<Element, { written: string; original: string | null }>();
  private readonly loading = new Set<string>();
  private request: number | undefined;
  private observer: ResizeObserver | undefined;
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
    this.framedAssets = '';
    if (typeof ResizeObserver === 'function') {
      this.observer = new ResizeObserver(() => this.schedule());
      this.observer.observe(canvas);
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
    this.loading.add(asset);
    void loadMeshAsset(asset)
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
        this.host.setAttribute(
          'data-sf-mesh-error',
          `${asset}: ${failure instanceof Error ? failure.message : String(failure)}`,
        );
      })
      .finally(() => this.loading.delete(asset));
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
    return this.data.meshes.map(mesh => ({ ...mesh, ...this.overrides.get(mesh.id) }));
  }

  private draw(): void {
    const { canvas, renderer } = this;
    if (!canvas || !renderer) {
      return;
    }
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    const scale = Math.min(ratio, MAX_PIXELS / Math.max(box.width, box.height, 1));
    const width = Math.max(1, Math.round(box.width * scale));
    const height = Math.max(1, Math.round(box.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const meshes = this.placed();
    // The camera is framed when what stands on the stage changes, not when a mesh moves, so a mesh that moves is seen moving.
    const loaded = meshes.filter(mesh => renderer.hasAsset(mesh.asset));
    const framing = `${width}x${height}|${loaded.map(mesh => mesh.id).join('|')}`;
    if (framing !== this.framedAssets) {
      this.frame = renderer.frame(meshes, this.yaw, this.pitch);
      this.framedAssets = framing;
    }
    this.camera = this.frame ? renderer.camera(this.frame, this.yaw, this.pitch) : undefined;
    renderer.draw(meshes, this.camera);
    this.placeAnchors();
    this.drawHandles();
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
      const at =
        mesh && this.toStage(transformPoint(modelMatrix(mesh.position, mesh.rotation, mesh.scale), anchor.point));
      if (!at) {
        continue;
      }
      for (const node of this.svg.querySelectorAll(`[data-sf-id="${CSS.escape(anchor.objectId)}"]`)) {
        const current = node.getAttribute('transform');
        const known = this.originals.get(node);
        const original = known && known.written === current ? known.original : current;
        const written = `translate(${at.x} ${at.y})${original ? ` ${original}` : ''}`;
        node.setAttribute('transform', written);
        this.originals.set(node, { written, original });
      }
    }
  }

  private selectedMesh(): Mesh | undefined {
    return this.placed().find(mesh => mesh.id === this.selected);
  }

  private drawHandles(): void {
    const mesh = this.selectedMesh();
    const box = mesh && this.renderer?.box([mesh]);
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
    this.handles.innerHTML = parts.join('');
  }

  private axisLength(box: { min: Vec3; max: Vec3 }): number {
    return Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]) * 0.6;
  }

  private readonly onHandleDown = (event: PointerEvent): void => {
    const mesh = this.selectedMesh();
    const box = mesh && this.renderer?.box([mesh]);
    const target = event.target as Element;
    const axisName = target.getAttribute('data-mesh-axis');
    const spinning = target.hasAttribute('data-mesh-spin');
    if (!mesh || !box || event.button !== 0 || (!axisName && !spinning)) {
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
    let change: { position?: Vec3; rotation?: Vec3 } = {};
    const move = (next: PointerEvent) => {
      const [dx, dy] = [next.clientX - startX, next.clientY - startY];
      if (spinning) {
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
      if (change.position || change.rotation) {
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
    this.select(hit);
  };

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
    this.draw();
    return this.canvas.toDataURL('image/png');
  }

  private release(): void {
    this.observer?.disconnect();
    this.observer = undefined;
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
