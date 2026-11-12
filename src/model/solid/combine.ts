// Joining bodies made of flat faces: one added to another, cut out of it, or kept where both are. Each body is
// sorted into a tree of the planes of its faces. A face of one body is then cut along the planes of the other, and
// the pieces that lie on the wrong side are dropped.

export type V3 = [number, number, number];

export interface Corner {
  at: V3;
  normal: V3;
}

interface Plane {
  normal: V3;
  w: number;
}

export interface Face {
  corners: Corner[];
  plane: Plane;
}

export type Joining = 'add' | 'cut' | 'keep';

const EPSILON = 1e-6;
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export function faceOf(corners: Corner[]): Face | undefined {
  const [a, b, c] = [corners[0].at, corners[1].at, corners[2].at];
  const [u, v]: [V3, V3] = [
    [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
  ];
  const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(n[0], n[1], n[2]);
  if (length < 1e-12) {
    return undefined;
  }
  const normal: V3 = [n[0] / length, n[1] / length, n[2] / length];
  return { corners, plane: { normal, w: dot(normal, a) } };
}

const turnedOver = (face: Face): Face => ({
  corners: [...face.corners]
    .reverse()
    .map(corner => ({ at: corner.at, normal: [-corner.normal[0], -corner.normal[1], -corner.normal[2]] })),
  plane: { normal: [-face.plane.normal[0], -face.plane.normal[1], -face.plane.normal[2]], w: -face.plane.w },
});

const [ON, FRONT, BACK, ACROSS] = [0, 1, 2, 3];

// Sorts a face by a plane: in it, before it, behind it, or cut in two along it.
function divide(plane: Plane, face: Face, onFront: Face[], onBack: Face[], front: Face[], back: Face[]): void {
  let kind = 0;
  const sides = face.corners.map(corner => {
    const distance = dot(plane.normal, corner.at) - plane.w;
    const side = distance < -EPSILON ? BACK : distance > EPSILON ? FRONT : ON;
    kind |= side;
    return side;
  });
  if (kind === ON) {
    (dot(plane.normal, face.plane.normal) > 0 ? onFront : onBack).push(face);
  } else if (kind === FRONT) {
    front.push(face);
  } else if (kind === BACK) {
    back.push(face);
  } else if (kind === ACROSS) {
    const [before, behind]: [Corner[], Corner[]] = [[], []];
    face.corners.forEach((corner, i) => {
      const j = (i + 1) % face.corners.length;
      const next = face.corners[j];
      if (sides[i] !== BACK) {
        before.push(corner);
      }
      if (sides[i] !== FRONT) {
        behind.push(corner);
      }
      if ((sides[i] | sides[j]) === ACROSS) {
        const step: V3 = [next.at[0] - corner.at[0], next.at[1] - corner.at[1], next.at[2] - corner.at[2]];
        const t = (plane.w - dot(plane.normal, corner.at)) / dot(plane.normal, step);
        const cut: Corner = { at: mix(corner.at, next.at, t), normal: mix(corner.normal, next.normal, t) };
        before.push(cut);
        behind.push(cut);
      }
    });
    if (before.length >= 3) {
      front.push({ corners: before, plane: face.plane });
    }
    if (behind.length >= 3) {
      back.push({ corners: behind, plane: face.plane });
    }
  }
}

class Tree {
  plane: Plane | undefined;
  front: Tree | undefined;
  back: Tree | undefined;
  faces: Face[] = [];

  constructor(faces: Face[] = []) {
    this.take(faces);
  }

  // Sorts more faces into the tree. The loop goes down one side, so a long row of faces does not go deep.
  take(all: Face[]): void {
    let node: Tree = this;
    let faces = all;
    while (faces.length > 0) {
      node.plane ??= faces[0].plane;
      const [front, back]: [Face[], Face[]] = [[], []];
      for (const face of faces) {
        divide(node.plane, face, node.faces, node.faces, front, back);
      }
      if (front.length > 0) {
        node.front ??= new Tree();
        node.front.take(front);
      }
      if (back.length === 0) {
        return;
      }
      node.back ??= new Tree();
      node = node.back;
      faces = back;
    }
  }

  turnOver(): void {
    for (let node: Tree | undefined = this; node; node = undefined) {
      const stack: Tree[] = [node];
      while (stack.length > 0) {
        const at = stack.pop() as Tree;
        at.faces = at.faces.map(turnedOver);
        if (at.plane) {
          at.plane = { normal: [-at.plane.normal[0], -at.plane.normal[1], -at.plane.normal[2]], w: -at.plane.w };
        }
        [at.front, at.back] = [at.back, at.front];
        if (at.front) {
          stack.push(at.front);
        }
        if (at.back) {
          stack.push(at.back);
        }
      }
    }
  }

  // The parts of these faces that are not inside the body of this tree.
  outside(faces: Face[]): Face[] {
    if (!this.plane) {
      return faces;
    }
    const [front, back]: [Face[], Face[]] = [[], []];
    for (const face of faces) {
      divide(this.plane, face, front, back, front, back);
    }
    const kept = this.front ? this.front.outside(front) : front;
    return this.back ? [...kept, ...this.back.outside(back)] : kept;
  }

  // Drops from this tree what lies inside the body of another.
  clipTo(other: Tree): void {
    const stack: Tree[] = [this];
    while (stack.length > 0) {
      const at = stack.pop() as Tree;
      at.faces = other.outside(at.faces);
      if (at.front) {
        stack.push(at.front);
      }
      if (at.back) {
        stack.push(at.back);
      }
    }
  }

  all(): Face[] {
    const found: Face[] = [];
    const stack: Tree[] = [this];
    while (stack.length > 0) {
      const at = stack.pop() as Tree;
      found.push(...at.faces);
      if (at.front) {
        stack.push(at.front);
      }
      if (at.back) {
        stack.push(at.back);
      }
    }
    return found;
  }
}

export function joinBodies(first: Face[], second: Face[], joining: Joining): Face[] {
  const a = new Tree(first);
  const b = new Tree(second);
  if (joining === 'add') {
    a.clipTo(b);
    b.clipTo(a);
    b.turnOver();
    b.clipTo(a);
    b.turnOver();
    a.take(b.all());
    return a.all();
  }
  a.turnOver();
  if (joining === 'cut') {
    a.clipTo(b);
    b.clipTo(a);
    b.turnOver();
    b.clipTo(a);
    b.turnOver();
  } else {
    b.clipTo(a);
    b.turnOver();
    a.clipTo(b);
    b.clipTo(a);
  }
  a.take(b.all());
  a.turnOver();
  return a.all();
}
