import { MeshStage } from './meshStage';
import {
  dataOf,
  MESH_HANDLES_ATTR,
  MESH_STAGE_ATTR,
  type MeshObjectPoint,
  type MeshObjectQuery,
  type MeshStageOptions,
  type MeshStagesHandle,
} from './stageTypes';

export type { MeshObjectBox } from './handles';
export type {
  MeshHandleChange,
  MeshObjectPoint,
  MeshObjectQuery,
  MeshStageEvents,
  MeshStageOptions,
  MeshStagesHandle,
} from './stageTypes';
export { MESH_HANDLES_ATTR, MESH_STAGE_ATTR } from './stageTypes';

class MeshStages implements MeshStagesHandle {
  private readonly stages = new Map<string, MeshStage>();
  private readonly pending = new Map<string, number | string>();
  private editing = true;
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
        const created = new MeshStage(host, this.svg, this.options);
        created.setEditing(this.editing);
        this.stages.set(id, created);
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

  setEditing(editing: boolean): void {
    this.editing = editing;
    for (const stage of this.stages.values()) {
      stage.setEditing(editing);
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
