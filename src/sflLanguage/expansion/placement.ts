import type { Placement, SflBlock } from '../ast';
import { resolveNumeric } from './evaluation';
import { fail, type Scope } from './scope';

type V3 = [number, number, number];

// The turn of degrees about x, then y, then z, as a matrix by rows. The same order the viewer turns a mesh in.
export function turnMatrix([x, y, z]: readonly number[]): number[] {
  const [a, b, c] = [x, y, z].map(angle => (angle * Math.PI) / 180);
  const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)];
  return [
    cc * cb,
    cc * sb * sa - sc * ca,
    cc * sb * ca + sc * sa,
    sc * cb,
    sc * sb * sa + cc * ca,
    sc * sb * ca - cc * sa,
    -sb,
    cb * sa,
    cb * ca,
  ];
}

// The degrees about x, then y, then z, that a turn matrix is made of.
export function turnDegrees(m: readonly number[]): V3 {
  const degrees = (radians: number) => Math.round(((radians * 180) / Math.PI) * 1e6) / 1e6 || 0;
  const sb = Math.max(-1, Math.min(1, -m[6]));
  // Turned a quarter about y, the turns about x and z fall on one axis; it is all given to z.
  if (Math.abs(sb) > 0.999999) {
    return [0, degrees(Math.asin(sb)), degrees(Math.atan2(-m[1], m[4]))];
  }
  return [degrees(Math.atan2(m[7], m[8])), degrees(Math.asin(sb)), degrees(Math.atan2(m[3], m[0]))];
}

const times = (m: readonly number[], v: readonly number[]): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

const product = (a: readonly number[], b: readonly number[]): number[] =>
  [0, 1, 2].flatMap(row =>
    [0, 1, 2].map(column => a[row * 3] * b[column] + a[row * 3 + 1] * b[3 + column] + a[row * 3 + 2] * b[6 + column]),
  );

// A placement inside another: first the inner one, then the outer one.
export function within(outer: Placement, inner: Placement): Placement {
  const moved = times(outer.turn, inner.at);
  return {
    at: [
      outer.at[0] + outer.scale * moved[0],
      outer.at[1] + outer.scale * moved[1],
      outer.at[2] + outer.scale * moved[2],
    ],
    turn: product(outer.turn, inner.turn),
    scale: outer.scale * inner.scale,
  };
}

// Where something placed at a position, with a turn and a scale of its own, comes to lie when its Use is placed.
export function placeInUse(
  placement: Placement,
  position: readonly number[],
  rotation: readonly number[],
  scale: readonly number[],
): { position: V3; rotation: V3; scale: V3 } {
  const placed = within(placement, {
    at: [position[0], position[1], position[2]],
    turn: turnMatrix(rotation),
    scale: 1,
  });
  return {
    position: placed.at,
    rotation: turnDegrees(placed.turn),
    scale: [scale[0] * placement.scale, scale[1] * placement.scale, scale[2] * placement.scale],
  };
}

// The placement a Use writes in its layout: a position, a turn in degrees, and one scale, as a body is made larger evenly.
export function placementOf(scope: Scope, use: SflBlock): Placement | undefined {
  const properties = use.entries.flatMap(entry => (entry.type === 'layout' ? entry.layout.properties : []));
  if (properties.length === 0) {
    return undefined;
  }
  const numbers = (key: string): number[] | undefined => {
    const written = properties.find(property => property.key === key)?.value;
    if (!written) {
      return undefined;
    }
    const value = resolveNumeric(scope, written);
    if (value.type === 'number') {
      return [value.value];
    }
    if (value.type === 'tuple') {
      return value.values;
    }
    fail(scope, `${key} needs numbers`);
  };
  for (const { key } of properties) {
    if (key !== 'position' && key !== 'rotation' && key !== 'scale') {
      fail(scope, `the layout of a Use says its position, rotation and scale, not ${key}`);
    }
  }
  const three = (key: string): V3 => {
    const found = numbers(key) ?? [0, 0, 0];
    if (found.length !== 3) {
      fail(scope, `${key} of a Use needs three numbers: x, y, z`);
    }
    return [found[0], found[1], found[2]];
  };
  const scale = numbers('scale') ?? [1];
  if (scale.length !== 1 || !(scale[0] > 0)) {
    fail(
      scope,
      'scale of a Use is one number above 0, as a Use is made larger evenly; a Template can take a parameter for a length',
    );
  }
  return { at: three('position'), turn: turnMatrix(three('rotation')), scale: scale[0] };
}
