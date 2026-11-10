import { DEFAULT_LIGHT, type Mesh, type MeshLight, setMeshValue } from '../../../model/mesh';
import type { MeshHandleChange, MeshStageFlags, Placement, StageData } from './stageTypes';
import type { StageSurface } from './surfaceTextures';

// What stands on a stage right now: the document, with what handles, data and the layers of a host have done to it.
export class StagePlacement {
  data: StageData = { id: '', orbit: [45, 27], shadow: false, meshes: [], anchors: [] };
  // Where a drag has put something, until the document says so itself.
  private readonly overrides = new Map<string, MeshHandleChange>();
  // Values that came from data while the drawing stayed as it was. They last until the data says otherwise.
  private readonly live = new Map<string, Map<string, number | string>>();
  private hidden: ReadonlySet<string> = new Set();
  private locked: ReadonlySet<string> = new Set();
  private placed: Placement | null = null;

  take(data: StageData): void {
    this.data = data;
    this.overrides.clear();
    this.placed = null;
  }

  // Anything that may change what stands on the stage makes it be worked out again.
  invalidate(): void {
    this.placed = null;
  }

  get(): Placement {
    this.placed ??= {
      meshes: this.visible(this.data.meshes).map(mesh => this.withValues(mesh)),
      surfaces: this.visible(this.data.surfaces ?? []).map(surface => ({
        ...this.withValues(surface),
        members: surface.members.filter(member => !this.hidden.has(member.id)),
      })),
      light: this.light(),
    };
    return this.placed;
  }

  get hiddenIds(): ReadonlySet<string> {
    return this.hidden;
  }

  isLocked(id: string): boolean {
    return this.locked.has(id);
  }

  // Whether a selection has to go, as what it names is hidden or locked now.
  isOutOfReach(id: string): boolean {
    return this.hidden.has(id) || this.locked.has(id);
  }

  // Whether the stage has the name, as a mesh, a Canvas or its light.
  has(id: string): boolean {
    return (
      this.data.meshes.some(mesh => mesh.id === id) ||
      this.data.light?.id === id ||
      Boolean(this.data.surfaces?.some(item => item.id === id))
    );
  }

  // The Canvas in the document that something lies on.
  surfaceWith(memberId: string): StageSurface | undefined {
    return this.data.surfaces?.find(item => item.members.some(member => member.id === memberId));
  }

  move(id: string, change: MeshHandleChange): void {
    this.overrides.set(id, { ...this.overrides.get(id), ...change });
    this.placed = null;
  }

  setValue(id: string, property: string, value: number | string): void {
    let values = this.live.get(id);
    if (!values) {
      values = new Map();
      this.live.set(id, values);
    }
    values.set(property, value);
    this.placed = null;
  }

  clearValues(): void {
    this.live.clear();
    this.placed = null;
  }

  setFlags({ hidden, locked }: MeshStageFlags): void {
    this.hidden = new Set(hidden);
    this.locked = new Set(locked);
    this.placed = null;
  }

  private withValues<T extends Mesh | StageSurface>(item: T): T {
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

  private light(): MeshLight {
    // An environment lights the world on its own, as in a photo studio. A sun comes only when the document asks for one.
    const fallback = this.data.environment ? { ...DEFAULT_LIGHT, intensity: 0 } : DEFAULT_LIGHT;
    const light = { ...(this.data.light ?? fallback) };
    for (const [property, value] of this.live.get(light.id) ?? []) {
      setMeshValue(light, property, value);
    }
    return this.hidden.has(light.id) ? { ...light, intensity: 0 } : light;
  }

  // A hidden Scene hides all that stands in it.
  private visible<T extends { id: string }>(items: readonly T[]): T[] {
    return this.hidden.has(this.data.id) ? [] : items.filter(item => !this.hidden.has(item.id));
  }
}
