import type { PathType } from '../../links';

type Point = { x: number; y: number };

export const getArrowPoints = (
  points: number[],
  pathType: PathType,
  direction: 'forward' | 'backward',
  from: Point,
  to: Point,
): number[] => {
  if (pathType === 'curved') {
    const numPoints = points.length;
    if (direction === 'forward') {
      const lastX = points[numPoints - 2];
      const lastY = points[numPoints - 1];
      const secondLastX = points[numPoints - 4];
      const secondLastY = points[numPoints - 3];

      const dx = lastX - secondLastX;
      const dy = lastY - secondLastY;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const arrowStartX = lastX - normalizedDx * 8;
        const arrowStartY = lastY - normalizedDy * 8;
        return [arrowStartX, arrowStartY, lastX, lastY];
      }

      return [secondLastX, secondLastY, lastX, lastY];
    } else {
      const firstX = points[0];
      const firstY = points[1];
      const secondX = points[2];
      const secondY = points[3];

      const dx = firstX - secondX;
      const dy = firstY - secondY;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const arrowStartX = firstX - normalizedDx * 8;
        const arrowStartY = firstY - normalizedDy * 8;
        return [arrowStartX, arrowStartY, firstX, firstY];
      }

      return [secondX, secondY, firstX, firstY];
    }
  } else {
    if (direction === 'forward') {
      const numPoints = points.length;
      if (numPoints >= 4) {
        return [points[numPoints - 4], points[numPoints - 3], points[numPoints - 2], points[numPoints - 1]];
      }
      return [points[0] || from.x, points[1] || from.y, points[2] || to.x, points[3] || to.y];
    } else {
      return [points[2] || to.x, points[3] || to.y, points[0] || from.x, points[1] || from.y];
    }
  }
};

export const getLineMidpoint = (
  points: number[],
  pathType: PathType,
  effectiveFrom: Point,
  effectiveTo: Point,
): Point => {
  if (pathType === 'curved') {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = points;
    const t = 0.5;
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    return { x, y };
  } else if (pathType === 'orthogonal') {
    let totalLength = 0;
    const segments: Array<{ start: Point; end: Point; length: number }> = [];

    for (let i = 0; i < points.length - 2; i += 2) {
      const start = { x: points[i], y: points[i + 1] };
      const end = { x: points[i + 2], y: points[i + 3] };
      const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      totalLength += length;
      segments.push({ start, end, length });
    }

    const halfLength = totalLength / 2;
    let accumulatedLength = 0;

    for (const segment of segments) {
      if (accumulatedLength + segment.length >= halfLength) {
        const remainingLength = halfLength - accumulatedLength;
        const t = remainingLength / segment.length;
        return {
          x: segment.start.x + t * (segment.end.x - segment.start.x),
          y: segment.start.y + t * (segment.end.y - segment.start.y),
        };
      }
      accumulatedLength += segment.length;
    }

    return {
      x: (effectiveFrom.x + effectiveTo.x) / 2,
      y: (effectiveFrom.y + effectiveTo.y) / 2,
    };
  } else {
    return {
      x: (effectiveFrom.x + effectiveTo.x) / 2,
      y: (effectiveFrom.y + effectiveTo.y) / 2,
    };
  }
};

export const getActualArrowEndpoints = (
  points: number[],
  pathType: PathType,
  from: Point,
  to: Point,
): { actualFrom: Point; actualTo: Point } => {
  const forwardArrow = getArrowPoints(points, pathType, 'forward', from, to);
  const backwardArrow = getArrowPoints(points, pathType, 'backward', from, to);

  const actualTo = { x: forwardArrow[2], y: forwardArrow[3] };
  const actualFrom = { x: backwardArrow[2], y: backwardArrow[3] };

  return { actualFrom, actualTo };
};

export const getMarkerTransform = (
  points: number[],
  direction: 'start' | 'end',
): { x: number; y: number; rotation: number } => {
  const numPoints = points.length;
  let x: number, y: number, angle: number;

  if (direction === 'end') {
    x = points[numPoints - 2];
    y = points[numPoints - 1];

    if (numPoints >= 4) {
      const dx = x - points[numPoints - 4];
      const dy = y - points[numPoints - 3];
      angle = Math.atan2(dy, dx) * (180 / Math.PI);
    } else {
      angle = 0;
    }
  } else {
    x = points[0];
    y = points[1];

    if (numPoints >= 4) {
      const dx = points[2] - x;
      const dy = points[3] - y;
      angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
    } else {
      angle = 180;
    }
  }

  return { x, y, rotation: angle };
};
