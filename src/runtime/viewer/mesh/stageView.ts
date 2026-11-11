import type { Vec3 } from '../../../model/mesh';
import { type Box, type Camera, FOV, frameBox, type MeshFrame, makeCamera, project, type StageWindow } from './camera';

const MAX_PIXELS = 4096;
const ORBIT_PER_PIXEL = 0.5;
const MAX_PITCH = 85;

export interface DrawingPoint {
  x: number;
  y: number;
}

// The camera of a stage: where it looks from, how it frames what stands there, and how points of the world, of the stage and of
// the screen turn into each other.
export class StageView {
  host: Element;
  camera: Camera | undefined;
  private readonly svg: SVGSVGElement;
  private frame: MeshFrame | undefined;
  private framed = '';
  private yaw = 45;
  private pitch = 27;
  // How much nearer or farther the camera is than the framing puts it, and how far it is moved sideways.
  private zoom = 1;
  private pan: Vec3 = [0, 0, 0];

  constructor(host: Element, svg: SVGSVGElement) {
    this.host = host;
    this.svg = svg;
  }

  // Steady, the camera keeps the frame it has when what stands on the stage changes, as in a tool where parts come and go.
  steady = false;

  get hasFrame(): boolean {
    return this.frame !== undefined;
  }

  // Whether the camera has framed anything yet.
  get hasFramed(): boolean {
    return this.framed !== '';
  }

  lookFrom([yaw, pitch]: readonly [number, number]): void {
    this.yaw = yaw;
    this.pitch = pitch;
  }

  // The next picture frames what stands on the stage again.
  reframe(): void {
    this.framed = '';
  }

  clear(): void {
    this.frame = undefined;
    this.camera = undefined;
  }

  // Sets the canvas to the part of the stage on the screen, so it stays as sharp as the screen at any zoom.
  fit(canvas: HTMLCanvasElement, wholeStage: boolean): { aspect: number; window: StageWindow } {
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

  // Makes the camera for a picture. It is framed again only when `key` changes: when what stands on the stage changes, not when a
  // mesh moves, so a mesh that moves is seen moving.
  aim(key: string, aspect: number, window: StageWindow, box: () => Box | undefined, shadowFrom?: Vec3): void {
    if (key !== this.framed && !(this.steady && this.frame)) {
      const bounds = box();
      this.frame = bounds && frameBox(bounds, this.yaw, this.pitch, aspect, shadowFrom);
      this.framed = key;
    }
    const { frame } = this;
    this.camera = frame
      ? makeCamera(
          {
            ...frame,
            center: frame.center.map((value, axis) => value + this.pan[axis]) as typeof frame.center,
            distance: frame.distance * this.zoom,
          },
          this.yaw,
          this.pitch,
          aspect,
          window,
        )
      : undefined;
  }

  zoomBy(wheel: number): void {
    this.zoom = Math.min(4, Math.max(0.15, this.zoom * Math.exp(wheel * 0.002)));
  }

  orbitBy(dx: number, dy: number): void {
    this.yaw -= dx * ORBIT_PER_PIXEL;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dy * ORBIT_PER_PIXEL));
  }

  // Moves the camera sideways by pixels of the screen. False when there is no camera to move.
  panBy(dx: number, dy: number): boolean {
    const { camera, frame } = this;
    if (!camera || !frame) {
      return false;
    }
    // What a pixel spans at the distance of what the camera looks at.
    const height = this.host.getBoundingClientRect().height || 1;
    const perPixel = (2 * frame.distance * this.zoom * Math.tan(FOV / 2)) / height;
    this.pan = this.pan.map(
      (value, axis) => value - camera.right[axis] * dx * perPixel + camera.up[axis] * dy * perPixel,
    ) as Vec3;
    return true;
  }

  // A point of the screen on the whole stage, from -1 to 1.
  stagePoint(clientX: number, clientY: number): [number, number] {
    return pointIn(this.host.getBoundingClientRect(), clientX, clientY);
  }

  // A point of the 3D world on the screen, or undefined behind the camera.
  toClient(point: readonly number[]): { x: number; y: number } | undefined {
    const projected = this.camera && project(this.camera, point);
    if (!projected) {
      return undefined;
    }
    const box = this.host.getBoundingClientRect();
    return { x: box.left + ((projected[0] + 1) / 2) * box.width, y: box.top + ((1 - projected[1]) / 2) * box.height };
  }

  // A point of the 3D world in the units of the 2D drawing, from the corner of the stage.
  toStage(point: readonly number[]): DrawingPoint | undefined {
    const projected = this.camera && project(this.camera, point);
    if (!projected) {
      return undefined;
    }
    const width = Number(this.host.getAttribute('width'));
    const height = Number(this.host.getAttribute('height'));
    return { x: ((projected[0] + 1) / 2) * width, y: ((1 - projected[1]) / 2) * height };
  }

  readonly toDrawing = (point: readonly number[]): DrawingPoint | undefined => {
    const inStage = this.toStage(point);
    return (
      inStage && {
        x: inStage.x + Number(this.host.getAttribute('x')),
        y: inStage.y + Number(this.host.getAttribute('y')),
      }
    );
  };
}

// A point of the screen within a box, from -1 to 1 and upwards.
export function pointIn(box: DOMRect, clientX: number, clientY: number): [number, number] {
  return [((clientX - box.left) / box.width) * 2 - 1, 1 - ((clientY - box.top) / box.height) * 2];
}
