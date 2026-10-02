type Point = readonly [number, number];
type Lobe = readonly [centerX: number, centerY: number, radius: number];
type Curve = readonly [control1: Point, control2: Point, end: Point];

interface CloudOutline {
  start: Point;
  curves: readonly Curve[];
}

interface LobeArc {
  lobe: Lobe;
  from: number;
  to: number;
}

const CLOUD_LOBES: readonly Lobe[] = [
  [30, 64, 24],
  [52, 40, 22],
  [86, 32, 28],
  [118, 42, 24],
  [132, 64, 24],
];

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = 4 * QUARTER_TURN;
const BOTTOM_ANGLE = Math.PI / 2;
const EPSILON = 1e-9;

function pointOnLobe([centerX, centerY, radius]: Lobe, angle: number): Point {
  return [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)];
}

function angleOnLobe([centerX, centerY]: Lobe, point: Point): number {
  return Math.atan2(point[1] - centerY, point[0] - centerX);
}

function outerCusp(first: Lobe, second: Lobe, centroid: Point): Point {
  const dx = second[0] - first[0];
  const dy = second[1] - first[1];
  const distance = Math.hypot(dx, dy);
  const along = (first[2] ** 2 - second[2] ** 2 + distance ** 2) / (2 * distance);
  const across = Math.sqrt(Math.max(0, first[2] ** 2 - along ** 2));
  const footX = first[0] + (along * dx) / distance;
  const footY = first[1] + (along * dy) / distance;
  const candidates: Point[] = [
    [footX - (across * dy) / distance, footY + (across * dx) / distance],
    [footX + (across * dy) / distance, footY - (across * dx) / distance],
  ];
  const fromCentroid = (point: Point) => Math.hypot(point[0] - centroid[0], point[1] - centroid[1]);
  return fromCentroid(candidates[0]) > fromCentroid(candidates[1]) ? candidates[0] : candidates[1];
}

function lobeArcs(lobes: readonly Lobe[]): LobeArc[] {
  const centroid: Point = [
    lobes.reduce((sum, lobe) => sum + lobe[0], 0) / lobes.length,
    lobes.reduce((sum, lobe) => sum + lobe[1], 0) / lobes.length,
  ];
  return lobes.map((lobe, index) => {
    const from = index === 0 ? BOTTOM_ANGLE : angleOnLobe(lobe, outerCusp(lobes[index - 1], lobe, centroid));
    const isLast = index === lobes.length - 1;
    let to = isLast ? BOTTOM_ANGLE : angleOnLobe(lobe, outerCusp(lobe, lobes[index + 1], centroid));
    while (to <= from) {
      to += FULL_TURN;
    }
    return { lobe, from, to };
  });
}

function quarterStops(from: number, to: number): number[] {
  const stops: number[] = [];
  for (let turn = Math.floor(from / QUARTER_TURN) + 1; turn * QUARTER_TURN < to - EPSILON; turn++) {
    stops.push(turn * QUARTER_TURN);
  }
  return [...stops, to];
}

function arcCurves({ lobe, from, to }: LobeArc): { start: Point; curves: Curve[] } {
  const start = pointOnLobe(lobe, from);
  const curves: Curve[] = [];
  let angle = from;
  for (const stop of quarterStops(from, to)) {
    const reach = (4 / 3) * Math.tan((stop - angle) / 4) * lobe[2];
    const begin = pointOnLobe(lobe, angle);
    const end = pointOnLobe(lobe, stop);
    curves.push([
      [begin[0] - reach * Math.sin(angle), begin[1] + reach * Math.cos(angle)],
      [end[0] + reach * Math.sin(stop), end[1] - reach * Math.cos(stop)],
      end,
    ]);
    angle = stop;
  }
  return { start, curves };
}

function normalizedCloudOutline(): CloudOutline {
  const arcs = lobeArcs(CLOUD_LOBES).map(arcCurves);
  const start = arcs[0].start;
  const curves = arcs.flatMap(arc => arc.curves);
  const anchors = [start, ...curves.map(curve => curve[2])];
  const minX = Math.min(...anchors.map(point => point[0]));
  const maxX = Math.max(...anchors.map(point => point[0]));
  const minY = Math.min(...anchors.map(point => point[1]));
  const maxY = Math.max(...anchors.map(point => point[1]));
  const unit = (point: Point): Point => [(point[0] - minX) / (maxX - minX), (point[1] - minY) / (maxY - minY)];
  return {
    start: unit(start),
    curves: curves.map(([first, second, end]) => [unit(first), unit(second), unit(end)]),
  };
}

const CLOUD_OUTLINE = normalizedCloudOutline();

export function cloudPath(x: number, y: number, width: number, height: number): string {
  const at = ([u, v]: Point) => `${x + u * width} ${y + v * height}`;
  const curves = CLOUD_OUTLINE.curves.map(([first, second, end]) => `C ${at(first)} ${at(second)} ${at(end)}`);
  return `M ${at(CLOUD_OUTLINE.start)} ${curves.join(' ')} Z`;
}
