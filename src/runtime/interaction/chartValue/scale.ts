import type { ValueScale } from './types';

export function parseValueScale(element: Element | null): ValueScale | null {
  const raw = element?.getAttribute('data-sf-value-scale');
  if (!raw) {
    return null;
  }
  const parts = raw.split(',');
  const [plotY, plotHeight, min, max] = parts.map(Number);
  if ([plotY, plotHeight, min, max].some(value => !Number.isFinite(value))) {
    return null;
  }
  if (plotHeight <= 0 || max === min) {
    return null;
  }
  return parts[4] === 'horizontal'
    ? { horizontal: true, plotY, plotHeight, min, max }
    : { plotY, plotHeight, min, max };
}

export function valueAtPixel(position: number, scale: ValueScale): number {
  const fraction = scale.horizontal
    ? (position - scale.plotY) / scale.plotHeight
    : (scale.plotY + scale.plotHeight - position) / scale.plotHeight;
  const value = scale.min + fraction * (scale.max - scale.min);
  return Math.min(Math.max(value, scale.min), scale.max);
}

export function pixelForValue(value: number, scale: ValueScale): number {
  const fraction = (value - scale.min) / (scale.max - scale.min);
  return scale.horizontal
    ? scale.plotY + fraction * scale.plotHeight
    : scale.plotY + scale.plotHeight - fraction * scale.plotHeight;
}
