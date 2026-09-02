import type { FieldSample } from './types';

export function idwInterpolate(samples: FieldSample[], pointX: number, pointY: number, power: number): number {
  let weightedSum = 0;
  let weightSum = 0;
  for (const sample of samples) {
    const deltaX = sample.x - pointX;
    const deltaY = sample.y - pointY;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared === 0) {
      return sample.value;
    }
    const weight = 1 / distanceSquared ** (power / 2);
    weightedSum += weight * sample.value;
    weightSum += weight;
  }
  return weightSum === 0 ? 0 : weightedSum / weightSum;
}
