import type { Rect } from '../../../model/geometry/types';
import type { AxisSnap, EdgePoint, RectGuideLine, SnapConfig, SnapResult } from './types';

interface SnapMatch {
  distance: number;
  delta: number;
  guide: RectGuideLine;
}

const TARGET_POINTS: EdgePoint[] = ['min', 'center', 'max'];

function edgePoints(minimum: number, size: number): Record<EdgePoint, number> {
  return { min: minimum, center: minimum + size / 2, max: minimum + size };
}

function findHorizontalSnap(bounds: Rect, candidates: Rect[], config: SnapConfig): AxisSnap {
  const sourcePoints = edgePoints(bounds.x, bounds.width);
  let bestMatch: SnapMatch | null = null;

  for (const candidate of candidates) {
    const targetPoints = edgePoints(candidate.x, candidate.width);
    for (const sourcePoint of config.activeX) {
      for (const targetPoint of TARGET_POINTS) {
        const distance = Math.abs(sourcePoints[sourcePoint] - targetPoints[targetPoint]);
        if (distance < config.threshold && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = {
            distance,
            delta: targetPoints[targetPoint] - sourcePoints[sourcePoint],
            guide: {
              orientation: 'vertical',
              position: targetPoints[targetPoint],
              from: Math.min(bounds.y, candidate.y) - config.guideOverhang,
              to: Math.max(bounds.y + bounds.height, candidate.y + candidate.height) + config.guideOverhang,
            },
          };
        }
      }
    }
  }

  return { delta: bestMatch?.delta ?? 0, guide: bestMatch?.guide ?? null };
}

function findVerticalSnap(bounds: Rect, candidates: Rect[], config: SnapConfig): AxisSnap {
  const sourcePoints = edgePoints(bounds.y, bounds.height);
  let bestMatch: SnapMatch | null = null;

  for (const candidate of candidates) {
    const targetPoints = edgePoints(candidate.y, candidate.height);
    for (const sourcePoint of config.activeY) {
      for (const targetPoint of TARGET_POINTS) {
        const distance = Math.abs(sourcePoints[sourcePoint] - targetPoints[targetPoint]);
        if (distance < config.threshold && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = {
            distance,
            delta: targetPoints[targetPoint] - sourcePoints[sourcePoint],
            guide: {
              orientation: 'horizontal',
              position: targetPoints[targetPoint],
              from: Math.min(bounds.x, candidate.x) - config.guideOverhang,
              to: Math.max(bounds.x + bounds.width, candidate.x + candidate.width) + config.guideOverhang,
            },
          };
        }
      }
    }
  }

  return { delta: bestMatch?.delta ?? 0, guide: bestMatch?.guide ?? null };
}

export function computeSnap(bounds: Rect, candidates: Rect[], config: SnapConfig): SnapResult {
  return {
    x: findHorizontalSnap(bounds, candidates, config),
    y: findVerticalSnap(bounds, candidates, config),
  };
}
