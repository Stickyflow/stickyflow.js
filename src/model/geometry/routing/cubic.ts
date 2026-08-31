import type { CubicPoints, Side } from './types'
import { SIDE_N } from './internal'

function controlDistances(
  p0:{x:number;y:number}, p3:{x:number;y:number},
  n0:[number,number], n3:[number,number],
  opts?: {min?:number; max?:number; sMult?:number}
): {d1:number; d2:number} {
  const min = opts?.min ?? 50;
  const max = opts?.max ?? 240;
  const sMult = opts?.sMult ?? 0.9; // how aggressively we enlarge for S

  // components along normals (how far we need to "push out")
  const vx = p3.x - p0.x, vy = p3.y - p0.y;

  const along0 = Math.abs(vx*n0[0] + vy*n0[1]);
  const along3 = Math.abs(vx*n3[0] + vy*n3[1]);

  // secondary separation pushes stronger S if small or negative along components
  const perp0 = Math.abs(vx*n0[1] - vy*n0[0]);
  const perp3 = Math.abs(vx*n3[1] - vy*n3[0]);

  // normals parallel? boost to create S
  const parallel = (n0[0]===n3[0] && n0[1]===n3[1]) || (n0[0]===-n3[0] && n0[1]===-n3[1]);

  let d1 = Math.max(min, Math.min(max, Math.max(along0, perp0*sMult)));
  let d2 = Math.max(min, Math.min(max, Math.max(along3, perp3*sMult)));

  if (parallel) {
    d1 = Math.min(max, d1 + perp0 * 0.75);
    d2 = Math.min(max, d2 + perp3 * 0.75);
  }

  return { d1, d2 };
}

/** Build a cubic with orthogonal endpoints */
export function routeCubic(
  from:{x:number;y:number}, to:{x:number;y:number},
  fromSide: Side, toSide: Side,
  opts?: {min?:number; max?:number; sMult?:number}
): CubicPoints {
  const n0 = SIDE_N[fromSide];
  const n3 = SIDE_N[toSide];

  const { d1, d2 } = controlDistances(from, to, n0, n3, opts);
  const p1:[number,number] = [ from.x + n0[0]*d1, from.y + n0[1]*d1 ];
  const p2:[number,number] = [ to.x   + n3[0]*d2, to.y   + n3[1]*d2 ];

  return { p0:[from.x, from.y], p1, p2, p3:[to.x, to.y] };
}

