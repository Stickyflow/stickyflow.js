// A tree of boxes around triangles, so a ray only has to be tried against the few it may hit.
export interface Bvh {
  // Eight numbers per node: the least corner and, for a leaf, its first triangle, or else the place of its second child; then
  // the greatest corner and how many triangles a leaf has, 0 for a node with children. The first child comes right after its node.
  nodes: Float32Array;
  // The triangles in the order of the leaves.
  order: Uint32Array;
}

const LEAF_SIZE = 4;

// `corners` holds nine numbers per triangle: its three corners.
export function buildBvh(corners: Float32Array): Bvh {
  const count = corners.length / 9;
  const order = new Uint32Array(count);
  const centers = new Float32Array(count * 3);
  for (let triangle = 0; triangle < count; triangle++) {
    order[triangle] = triangle;
    for (let axis = 0; axis < 3; axis++) {
      const at = triangle * 9 + axis;
      centers[triangle * 3 + axis] = (corners[at] + corners[at + 3] + corners[at + 6]) / 3;
    }
  }
  const nodes: number[] = [];

  const build = (start: number, end: number): void => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const centerMin = [Infinity, Infinity, Infinity];
    const centerMax = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++) {
      const triangle = order[i];
      for (let axis = 0; axis < 3; axis++) {
        for (let corner = 0; corner < 3; corner++) {
          const value = corners[triangle * 9 + corner * 3 + axis];
          min[axis] = Math.min(min[axis], value);
          max[axis] = Math.max(max[axis], value);
        }
        const center = centers[triangle * 3 + axis];
        centerMin[axis] = Math.min(centerMin[axis], center);
        centerMax[axis] = Math.max(centerMax[axis], center);
      }
    }
    const node = nodes.length;
    nodes.push(min[0], min[1], min[2], start, max[0], max[1], max[2], end - start);
    if (end - start <= LEAF_SIZE) {
      return;
    }
    // Split in the middle along the side on which the triangles spread the most.
    const spread = centerMax.map((value, axis) => value - centerMin[axis]);
    const axis = spread.indexOf(Math.max(...spread));
    order.subarray(start, end).sort((a, b) => centers[a * 3 + axis] - centers[b * 3 + axis]);
    const middle = (start + end) >> 1;
    build(start, middle);
    nodes[node + 3] = nodes.length / 8;
    nodes[node + 7] = 0;
    build(middle, end);
  };

  if (count > 0) {
    build(0, count);
  }
  return { nodes: new Float32Array(nodes), order };
}
