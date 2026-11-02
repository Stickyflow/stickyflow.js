import { type LayoutTuple, setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock } from '../scanner';

export interface MeshChange {
  id: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  size?: [number, number];
}

export interface MeshObjectChange {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// What lies on a Canvas counts from its corner, so the numbers go into its layout as they are.
export function applyMeshObjectChange(sfl: string, change: MeshObjectChange): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, change.id);
  if (!range) {
    return sfl;
  }
  setOrInsertLayoutTuples(lines, range, [
    ['position', change.x, change.y],
    ['size', change.width, change.height],
  ]);
  return lines.join('\n');
}

const rounded = (value: number) => Math.round(value * 1000) / 1000;

// What the handles of a mesh did, written into its layout.
export function applyMeshChange(sfl: string, change: MeshChange): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, change.id);
  if (!range) {
    return sfl;
  }
  const tuples: LayoutTuple[] = [];
  if (change.position) {
    tuples.push(['position', ...(change.position.map(rounded) as [number, number, number])]);
  }
  if (change.rotation) {
    tuples.push(['rotation', ...(change.rotation.map(rounded) as [number, number, number])]);
  }
  if (change.scale) {
    tuples.push(['scale', ...(change.scale.map(rounded) as [number, number, number])]);
  }
  if (change.size) {
    tuples.push(['size', change.size[0], change.size[1]]);
  }
  setOrInsertLayoutTuples(lines, range, tuples);
  return lines.join('\n');
}
