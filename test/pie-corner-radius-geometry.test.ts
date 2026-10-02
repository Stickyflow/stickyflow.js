import { describe, expect, it } from 'vitest';
import { createPieSlicePath, type PieGeometry } from '../src/renderScene/charts/primitives';

interface ArcCommand {
  rx: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  largeArc: number;
  sweep: number;
}

function parsePath(d: string): { points: Array<{ x: number; y: number }>; arcs: ArcCommand[] } {
  const tokens = d.trim().split(/\s+/);
  const points: Array<{ x: number; y: number }> = [];
  const arcs: ArcCommand[] = [];
  let i = 0;
  let current = { x: 0, y: 0 };
  while (i < tokens.length) {
    const command = tokens[i];
    if (command === 'M' || command === 'L') {
      const point = { x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) };
      points.push(point);
      current = point;
      i += 3;
    } else if (command === 'A') {
      const rx = Number(tokens[i + 1]);
      const largeArc = Number(tokens[i + 4]);
      const sweep = Number(tokens[i + 5]);
      const to = { x: Number(tokens[i + 6]), y: Number(tokens[i + 7]) };
      arcs.push({ rx, from: current, to, largeArc, sweep });
      points.push(to);
      current = to;
      i += 8;
    } else {
      i += 1;
    }
  }
  return { points, arcs };
}

// Standard SVG endpoint-to-center arc parameterization (spec appendix F.6.5),
// specialized to rx === ry and x-axis-rotation === 0.
function arcCenter(arc: ArcCommand): { x: number; y: number } {
  const { rx: r } = arc;
  const x1p = (arc.from.x - arc.to.x) / 2;
  const y1p = (arc.from.y - arc.to.y) / 2;
  const sign = arc.largeArc !== arc.sweep ? 1 : -1;
  const numerator = r * r - x1p * x1p - y1p * y1p;
  const denominator = x1p * x1p + y1p * y1p;
  const co = sign * Math.sqrt(Math.max(0, numerator / denominator));
  const cxp = co * y1p;
  const cyp = -co * x1p;
  return { x: cxp + (arc.from.x + arc.to.x) / 2, y: cyp + (arc.from.y + arc.to.y) / 2 };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centerPoint(g: PieGeometry): { x: number; y: number } {
  return { x: g.centerX, y: g.centerY };
}

const geometry: PieGeometry = { centerX: 200, centerY: 150, outerRadius: 140, innerRadius: 0 };

describe('rounded pie corner geometry — every arc bulges outward, none inverted', () => {
  it('a plain pie slice: both fillets sit strictly inside the outer radius, at the intended fillet centers', () => {
    const cornerRadius = 16;
    const d = createPieSlicePath(geometry, { start: -Math.PI / 2, end: 0 }, cornerRadius);
    const { arcs } = parsePath(d);
    expect(arcs).toHaveLength(3);
    const [startFillet, mainArc, endFillet] = arcs;

    const startFilletCenter = arcCenter(startFillet);
    const startExpected = {
      x:
        geometry.centerX +
        (geometry.outerRadius - cornerRadius) *
          Math.cos(-Math.PI / 2 + Math.asin(cornerRadius / (geometry.outerRadius - cornerRadius))),
      y:
        geometry.centerY +
        (geometry.outerRadius - cornerRadius) *
          Math.sin(-Math.PI / 2 + Math.asin(cornerRadius / (geometry.outerRadius - cornerRadius))),
    };
    expect(startFilletCenter.x).toBeCloseTo(startExpected.x, 4);
    expect(startFilletCenter.y).toBeCloseTo(startExpected.y, 4);
    expect(distance(startFilletCenter, centerPoint(geometry))).toBeCloseTo(geometry.outerRadius - cornerRadius, 4);

    const mainArcCenter = arcCenter(mainArc);
    expect(mainArcCenter.x).toBeCloseTo(geometry.centerX, 4);
    expect(mainArcCenter.y).toBeCloseTo(geometry.centerY, 4);

    const endFilletCenter = arcCenter(endFillet);
    expect(distance(endFilletCenter, centerPoint(geometry))).toBeCloseTo(geometry.outerRadius - cornerRadius, 4);

    for (const arc of arcs) {
      const filletCenter = arcCenter(arc);
      const expectedRadius = arc.rx === cornerRadius ? cornerRadius : geometry.outerRadius;
      expect(distance(filletCenter, arc.from)).toBeCloseTo(expectedRadius, 2);
      expect(distance(filletCenter, arc.to)).toBeCloseTo(expectedRadius, 2);
    }
  });

  it('every point of every arc stays within the outer radius, never bulging past it', () => {
    const cornerRadius = 20;
    const d = createPieSlicePath(geometry, { start: 0.2, end: 1.4 }, cornerRadius);
    const { points } = parsePath(d);
    for (const point of points) {
      expect(distance(point, centerPoint(geometry))).toBeLessThanOrEqual(geometry.outerRadius + 1e-6);
    }
  });

  it('a donut slice: the inner fillets stay outside the hole, the outer fillets stay inside the rim', () => {
    const donut: PieGeometry = { ...geometry, innerRadius: 70 };
    const cornerRadius = 12;
    const start = -1;
    const d = createPieSlicePath(donut, { start, end: 1 }, cornerRadius);
    const { points, arcs } = parsePath(d);
    for (const point of points) {
      const r = distance(point, centerPoint(donut));
      expect(r).toBeGreaterThanOrEqual(donut.innerRadius - 1e-6);
      expect(r).toBeLessThanOrEqual(donut.outerRadius + 1e-6);
    }

    // 4th arc command is the inner-end fillet, connecting the end-edge line to the inner circle.
    const innerEndFillet = arcs[3];
    const innerFilletCenterRadius = donut.innerRadius + cornerRadius;
    const innerFilletCenter = arcCenter(innerEndFillet);
    expect(distance(innerFilletCenter, centerPoint(donut))).toBeCloseTo(innerFilletCenterRadius, 4);

    // 5th arc command is the main inner arc; it ends at the inner-start fillet's arc
    // tangent, on the inner circle, at an angle carved in from the raw boundary.
    const innerStartArcTangent = arcs[4].to;
    const innerStartAngle = Math.atan2(innerStartArcTangent.y - donut.centerY, innerStartArcTangent.x - donut.centerX);
    expect(innerStartAngle).toBeGreaterThan(start);
    expect(distance(innerStartArcTangent, centerPoint(donut))).toBeCloseTo(donut.innerRadius, 4);
  });

  it('reduces to the exact unrounded path when cornerRadius is 0', () => {
    const withZero = createPieSlicePath(geometry, { start: 0, end: 1 }, 0);
    const withoutArg = createPieSlicePath(geometry, { start: 0, end: 1 });
    expect(withZero).toBe(withoutArg);
  });
});
