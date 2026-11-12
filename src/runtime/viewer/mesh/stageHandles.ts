import type { Vec3 } from '../../../model/mesh';
import type { Box } from './camera';
import { draggedBox, handleDrag, type MeshObjectBox, meshHandlesMarkup, objectOutlineMarkup } from './handles';
import { transformPoint } from './matrix';
import type { MeshRenderer } from './renderer';
import { keepTextUnselected } from './stageGestures';
import { surfacePoint } from './stagePicking';
import type { StagePlacement } from './stagePlacement';
import { MESH_HANDLES_ATTR, type MeshHandleChange, type MeshStageEvents } from './stageTypes';
import type { StageView } from './stageView';
import { type StageSurface, surfaceMatrix } from './surfaceTextures';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

interface HandleTarget {
  svg: SVGSVGElement;
  view: StageView;
  placement: StagePlacement;
  events: MeshStageEvents;
  renderer(): MeshRenderer | null;
  // The mesh or Canvas that is selected, and what is selected on a Canvas.
  selected(): string | null;
  selectedObject(): string | null;
  // Something was dragged: a new picture is wanted.
  changed(): void;
  click(clientX: number, clientY: number): void;
}

// The handles of what is selected on a stage: those of a mesh or a Canvas, which move, turn and size it, and the outline of an
// object on a Canvas. Their drags change the picture at once and tell the host when they end.
export class StageHandles {
  private readonly target: HandleTarget;
  private group: SVGGElement | null = null;
  // Where a drag has put the object on a Canvas, until the document says so itself.
  private draft: MeshObjectBox | null = null;

  constructor(target: HandleTarget) {
    this.target = target;
  }

  dropDraft(): void {
    this.draft = null;
  }

  remove(): void {
    this.group?.remove();
    this.group = null;
  }

  draw(editing: boolean): void {
    const { svg, view } = this.target;
    const unit = 1 / (svg.getScreenCTM()?.a || 1);
    const onSurface = editing ? this.objectOnSurface() : undefined;
    if (onSurface) {
      const { surface, box } = onSurface;
      const matrix = surfaceMatrix(surface);
      const point = (x: number, y: number) =>
        view.toDrawing(transformPoint(matrix, [(x / surface.width) * 2 - 1, 1 - (y / surface.height) * 2, 0]));
      const markup = objectOutlineMarkup(box, point, unit);
      if (markup) {
        this.show(surface.id, markup);
        return;
      }
    }
    const item = editing ? this.selectedItem() : undefined;
    const markup = item && meshHandlesMarkup(item.position, item.box, view.toDrawing, unit);
    if (item && markup) {
      this.show(item.id, markup);
    } else {
      this.remove();
    }
  }

  // The mesh or the Canvas with handles, as both move in the same way.
  private selectedItem(): { id: string; position: Vec3; rotation: Vec3; scale: Vec3; box: Box } | undefined {
    const renderer = this.target.renderer();
    const selected = this.target.selected();
    const { meshes, surfaces } = this.target.placement.get();
    const surface = surfaces.find(item => item.id === selected);
    const mesh = meshes.find(item => item.id === selected);
    const box = surface
      ? renderer?.box([], [{ id: surface.id, matrix: surfaceMatrix(surface), layers: [] }])
      : mesh && renderer?.box([mesh]);
    const item = surface ?? mesh;
    return item && box && { id: item.id, position: item.position, rotation: item.rotation, scale: item.scale, box };
  }

  private objectOnSurface(): { surface: StageSurface; box: MeshObjectBox } | undefined {
    const id = this.target.selectedObject();
    const surface = this.target.placement.get().surfaces.find(item => item.members.some(member => member.id === id));
    const member = surface?.members.find(item => item.id === id);
    return surface && member ? { surface, box: this.draft ?? member } : undefined;
  }

  private show(id: string, markup: string): void {
    const { svg } = this.target;
    if (!this.group) {
      this.group = svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'g') as SVGGElement;
      this.group.addEventListener('pointerdown', this.onDown as EventListener);
      this.group.addEventListener('mousedown', keepTextUnselected);
    }
    this.group.setAttribute(MESH_HANDLES_ATTR, id);
    if (!this.group.isConnected) {
      svg.appendChild(this.group);
    }
    this.group.innerHTML = markup;
  }

  private dragObject(event: PointerEvent, part: string): void {
    const { svg, view, events } = this.target;
    const found = this.objectOnSurface();
    const id = this.target.selectedObject();
    const at = (pointer: PointerEvent) =>
      found && surfacePoint(view.camera, found.surface, view.stagePoint(pointer.clientX, pointer.clientY));
    const start = at(event);
    if (!found || !id || !start) {
      return;
    }
    event.stopPropagation();
    const window = svg.ownerDocument.defaultView;
    let moved = false;
    const move = (next: PointerEvent) => {
      const now = at(next);
      if (now) {
        const dx = Math.round(now.x - start.x);
        const dy = Math.round(now.y - start.y);
        moved = moved || dx !== 0 || dy !== 0;
        this.draft = draggedBox(found.box, part, dx, dy);
        this.target.changed();
      }
    };
    const up = () => {
      window?.removeEventListener('pointermove', move);
      window?.removeEventListener('pointerup', up);
      if (moved && this.draft) {
        events.objectChange(id, this.draft);
      }
    };
    window?.addEventListener('pointermove', move);
    window?.addEventListener('pointerup', up);
  }

  private readonly onDown = (event: PointerEvent): void => {
    const { svg, view, placement, events } = this.target;
    const pressed = event.target as Element;
    if (event.button !== 0) {
      return;
    }
    const objectPart = pressed.getAttribute('data-mesh-object');
    if (objectPart) {
      this.dragObject(event, objectPart);
      return;
    }
    const item = this.selectedItem();
    const changeFor = item && handleDrag(pressed, item, view.toDrawing, svg.getScreenCTM()?.a || 1);
    if (!item || !changeFor) {
      return;
    }
    event.stopPropagation();
    const window = svg.ownerDocument.defaultView;
    const { clientX: startX, clientY: startY } = event;
    let change: MeshHandleChange | undefined;
    // What goes along with the mesh that is dragged, and where each stood when the drag began.
    const along = placement.followers.includes(item.id)
      ? placement
          .get()
          .meshes.filter(mesh => mesh.id !== item.id && placement.followers.includes(mesh.id))
          .map(mesh => ({ id: mesh.id, position: mesh.position }))
      : [];
    const move = (next: PointerEvent) => {
      change = changeFor(next.clientX - startX, next.clientY - startY);
      placement.move(item.id, change);
      const to = change.position;
      if (to) {
        for (const other of along) {
          placement.move(other.id, {
            position: [
              other.position[0] + to[0] - item.position[0],
              other.position[1] + to[1] - item.position[1],
              other.position[2] + to[2] - item.position[2],
            ],
          });
        }
      }
      this.target.changed();
    };
    const up = (last: PointerEvent) => {
      window?.removeEventListener('pointermove', move);
      window?.removeEventListener('pointerup', up);
      if (change) {
        events.change(item.id, change);
      } else {
        // A handle that was only clicked lets the click through to what lies under it.
        this.target.click(last.clientX, last.clientY);
      }
    };
    window?.addEventListener('pointermove', move);
    window?.addEventListener('pointerup', up);
  };
}
