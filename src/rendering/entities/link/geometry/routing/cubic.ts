import type { Side } from '../../../../../model/geometry/types';
import { sideNormal } from './sideNormal';

function controlDistances(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromNormal: [number, number],
  toNormal: [number, number],
  options?: { min?: number; max?: number; perpendicularScale?: number },
): { fromDistance: number; toDistance: number } {
  const minimum = options?.min ?? 50;
  const maximum = options?.max ?? 240;
  const perpendicularScale = options?.perpendicularScale ?? 0.9;
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const alongFrom = Math.abs(deltaX * fromNormal[0] + deltaY * fromNormal[1]);
  const alongTo = Math.abs(deltaX * toNormal[0] + deltaY * toNormal[1]);
  const perpendicularFrom = Math.abs(deltaX * fromNormal[1] - deltaY * fromNormal[0]);
  const perpendicularTo = Math.abs(deltaX * toNormal[1] - deltaY * toNormal[0]);
  const parallel =
    (fromNormal[0] === toNormal[0] && fromNormal[1] === toNormal[1]) ||
    (fromNormal[0] === -toNormal[0] && fromNormal[1] === -toNormal[1]);

  let fromDistance = Math.max(minimum, Math.min(maximum, Math.max(alongFrom, perpendicularFrom * perpendicularScale)));
  let toDistance = Math.max(minimum, Math.min(maximum, Math.max(alongTo, perpendicularTo * perpendicularScale)));
  if (parallel) {
    fromDistance = Math.min(maximum, fromDistance + perpendicularFrom * 0.75);
    toDistance = Math.min(maximum, toDistance + perpendicularTo * 0.75);
  }
  return { fromDistance, toDistance };
}

export function routeCubic(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  options?: { min?: number; max?: number; perpendicularScale?: number },
): { p0: [number, number]; p1: [number, number]; p2: [number, number]; p3: [number, number] } {
  const fromNormal = sideNormal(fromSide);
  const toNormal = sideNormal(toSide);
  const { fromDistance, toDistance } = controlDistances(from, to, fromNormal, toNormal, options);
  return {
    p0: [from.x, from.y],
    p1: [from.x + fromNormal[0] * fromDistance, from.y + fromNormal[1] * fromDistance],
    p2: [to.x + toNormal[0] * toDistance, to.y + toNormal[1] * toDistance],
    p3: [to.x, to.y],
  };
}
