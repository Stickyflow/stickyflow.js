export interface MarkerTransform {
  x: number;
  y: number;
  rotation: number;
}

function endMarkerTransform(points: number[]): MarkerTransform {
  const last = points.length - 2;
  const x = points[last];
  const y = points[last + 1];
  if (points.length < 4) {
    return { x, y, rotation: 0 };
  }
  const dx = x - points[last - 2];
  const dy = y - points[last - 1];
  return { x, y, rotation: Math.atan2(dy, dx) * (180 / Math.PI) };
}

function startMarkerTransform(points: number[]): MarkerTransform {
  const x = points[0];
  const y = points[1];
  if (points.length < 4) {
    return { x, y, rotation: 180 };
  }
  const dx = points[2] - x;
  const dy = points[3] - y;
  return { x, y, rotation: Math.atan2(dy, dx) * (180 / Math.PI) + 180 };
}

export function getMarkerTransform(points: number[], direction: 'start' | 'end'): MarkerTransform {
  if (direction === 'end') {
    return endMarkerTransform(points);
  }
  return startMarkerTransform(points);
}
