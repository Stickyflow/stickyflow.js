import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock } from '../scanner';

export interface MeshChange {
  id: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

const rounded = (value: number) => Math.round(value * 1000) / 1000;

// What the handles of a mesh did, written into its layout.
export function applyMeshChange(sfl: string, change: MeshChange): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, change.id);
  if (!range) {
    return sfl;
  }
  const tuples: Array<[string, number, number, number]> = [];
  if (change.position) {
    tuples.push(['position', ...(change.position.map(rounded) as [number, number, number])]);
  }
  if (change.rotation) {
    tuples.push(['rotation', ...(change.rotation.map(rounded) as [number, number, number])]);
  }
  if (change.scale) {
    tuples.push(['scale', ...(change.scale.map(rounded) as [number, number, number])]);
  }
  setOrInsertLayoutTuples(lines, range, tuples);
  return lines.join('\n');
}
