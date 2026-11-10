import { isCameraGesture } from '../../dom';
import type { StageView } from './stageView';

const DRAG_THRESHOLD = 4;

// A drag on the stage would otherwise mark the texts it passes over.
export const keepTextUnselected = (event: Event): void => event.preventDefault();

interface GestureTarget {
  view: StageView;
  // The camera has moved, or a gesture has ended: a new picture is wanted.
  changed(): void;
  click(clientX: number, clientY: number): void;
}

// The pointer on a stage: a drag turns the camera, Ctrl or the middle button with a drag moves it sideways, Ctrl with the wheel
// moves it nearer or farther, and a press without a drag is a click.
export class StageGestures {
  private readonly target: GestureTarget;
  private gesture: { x: number; y: number; moved: boolean; pan?: boolean } | null = null;

  constructor(target: GestureTarget) {
    this.target = target;
  }

  // Whether a press is being held, so the picture is still changing.
  get active(): boolean {
    return this.gesture !== null;
  }

  bind(host: Element): void {
    host.addEventListener('pointerdown', this.onPointerDown as EventListener);
    host.addEventListener('mousedown', keepTextUnselected);
    host.addEventListener('pointermove', this.onPointerMove as EventListener);
    host.addEventListener('pointerup', this.onPointerUp as EventListener);
    host.addEventListener('pointercancel', this.onPointerCancel);
    host.addEventListener('wheel', this.onWheel as EventListener, { passive: false });
  }

  unbind(host: Element): void {
    host.removeEventListener('pointerdown', this.onPointerDown as EventListener);
    host.removeEventListener('mousedown', keepTextUnselected);
    host.removeEventListener('pointermove', this.onPointerMove as EventListener);
    host.removeEventListener('pointerup', this.onPointerUp as EventListener);
    host.removeEventListener('pointercancel', this.onPointerCancel);
    host.removeEventListener('wheel', this.onWheel as EventListener);
  }

  // The page around the Scene stays as it is. A wheel made by a program, as when a page turns the plain wheel into its own zoom,
  // is left to the page.
  private readonly onWheel = (event: WheelEvent): void => {
    const { view } = this.target;
    if (!event.isTrusted || !isCameraGesture(event) || !view.hasFrame) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    view.zoomBy(event.deltaY);
    this.target.changed();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
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
    const { view } = this.target;
    if (gesture.pan) {
      event.stopPropagation();
      if (view.panBy(dx, dy)) {
        this.target.changed();
      }
      return;
    }
    view.orbitBy(dx, dy);
    this.target.changed();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    this.gesture = null;
    if (gesture && !gesture.moved && !gesture.pan) {
      this.target.click(event.clientX, event.clientY);
    }
    // The last frame of a drag was a moving one, so one more is asked for, which starts the still picture.
    this.target.changed();
  };

  // A pointer that is taken away ends its gesture as a release does, without a click.
  private readonly onPointerCancel = (): void => {
    this.gesture = null;
    this.target.changed();
  };
}
