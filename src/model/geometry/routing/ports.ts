import { SIDE_N } from './internal';
import type { Bounds, Port, Side } from './types';

const DEG2RAD = Math.PI / 180;

function rotateVector(x: number, y: number, degrees: number): [number, number] {
  const rad = degrees * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [x * cos - y * sin, x * sin + y * cos];
}

function centerOf(b: Bounds): { x: number; y: number } {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function worldToLocal(bounds: Bounds, worldPt: { x: number; y: number }): { x: number; y: number } {
  const center = centerOf(bounds);
  const relative = { x: worldPt.x - center.x, y: worldPt.y - center.y };
  if (!bounds.rotation) return relative;

  const [lx, ly] = rotateVector(relative.x, relative.y, -bounds.rotation);
  return { x: lx, y: ly };
}

function localToWorld(bounds: Bounds, localPt: { x: number; y: number }): { x: number; y: number } {
  const center = centerOf(bounds);
  if (!bounds.rotation) {
    return { x: center.x + localPt.x, y: center.y + localPt.y };
  }

  const [wx, wy] = rotateVector(localPt.x, localPt.y, bounds.rotation);
  return { x: center.x + wx, y: center.y + wy };
}

export function portToPoint(b: Bounds, port: Port): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, port.offset));

  let localX = 0,
    localY = 0;
  const hw = b.width / 2,
    hh = b.height / 2;

  switch (port.side) {
    case 'top':
      localX = (t - 0.5) * b.width;
      localY = -hh;
      break;
    case 'right':
      localX = hw;
      localY = (t - 0.5) * b.height;
      break;
    case 'bottom':
      localX = (t - 0.5) * b.width;
      localY = hh;
      break;
    case 'left':
      localX = -hw;
      localY = (t - 0.5) * b.height;
      break;
  }

  return localToWorld(b, { x: localX, y: localY });
}

export function namedPortToPoint(b: Bounds, at: [number, number]): { x: number; y: number } {
  const localX = (at[0] - 0.5) * b.width;
  const localY = (at[1] - 0.5) * b.height;
  return localToWorld(b, { x: localX, y: localY });
}

export function projectOffsetOnSide(b: Bounds, side: Side, worldPt: { x: number; y: number }): number {
  const localPt = worldToLocal(b, worldPt);

  switch (side) {
    case 'top':
    case 'bottom':
      return (localPt.x + b.width / 2) / b.width;
    case 'left':
    case 'right':
      return (localPt.y + b.height / 2) / b.height;
  }
}

export function chooseSide(a: Bounds, b: Bounds, sticky?: Side): Side {
  const centerA = centerOf(a);
  const centerB = centerOf(b);
  const worldVector = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };

  const localVector = worldToLocal(a, { x: centerA.x + worldVector.x, y: centerA.y + worldVector.y });
  const localCenter = worldToLocal(a, centerA);

  const vx = localVector.x - localCenter.x;
  const vy = localVector.y - localCenter.y;

  const scoreSide = (s: Side) => {
    const n = SIDE_N[s];
    const dot = n[0] * vx + n[1] * vy;
    const absx = Math.abs(vx),
      absy = Math.abs(vy);
    const axisBias = s === 'left' || s === 'right' ? absx - absy : absy - absx;
    return dot + 0.5 * axisBias;
  };

  const best = (['left', 'right', 'top', 'bottom'] as Side[]).reduce(
    (acc, s) => (scoreSide(s) > scoreSide(acc) ? s : acc),
    'right',
  );

  if (!sticky) return best;

  const stickyScore = scoreSide(sticky);
  const bestScore = scoreSide(best);
  const hysteresis = 40;
  if (bestScore > stickyScore + hysteresis) return best;
  return sticky;
}

export function recommendPort(a: Bounds, b: Bounds, sticky?: Port): Port {
  const side = chooseSide(a, b, sticky?.side);

  let offset = 0.5;

  if (sticky && sticky.side === side) {
    offset = sticky.offset * 0.9 + 0.5 * 0.1;
  }

  return { side, offset };
}
