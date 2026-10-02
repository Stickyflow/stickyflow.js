import type { ValueScale } from './types';

export function parseValueScale(element: Element | null): ValueScale | null {
  const raw = element?.getAttribute('data-sf-value-scale');
  if (!raw) {
    return null;
  }
  const [plotY, plotHeight, min, max] = raw.split(',').map(Number);
  if ([plotY, plotHeight, min, max].some(value => !Number.isFinite(value))) {
    return null;
  }
  if (plotHeight <= 0 || max === min) {
    return null;
  }
  return { plotY, plotHeight, min, max };
}

export function valueAtPixel(y: number, scale: ValueScale): number {
  const value = scale.min + ((scale.plotY + scale.plotHeight - y) / scale.plotHeight) * (scale.max - scale.min);
  return Math.min(Math.max(value, scale.min), scale.max);
}

export function pixelForValue(value: number, scale: ValueScale): number {
  return scale.plotY + scale.plotHeight - ((value - scale.min) / (scale.max - scale.min)) * scale.plotHeight;
}
