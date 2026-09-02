import type { MarkerType } from '../../model/links';
import { num } from './format';

export function markerBody(
  type: Exclude<MarkerType, 'none'>,
  size: number,
  color: string,
  strokeWidth: number,
): string {
  const bodies: Record<Exclude<MarkerType, 'none'>, string> = {
    arrow: `<path d="M ${num(-size)} ${num(-size * 0.6)} L 0 0 L ${num(-size)} ${num(size * 0.6)}" fill="none" stroke="${color}" stroke-width="${num(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    filled_arrow: `<path d="M ${num(-size)} ${num(-size * 0.6)} L 0 0 L ${num(-size)} ${num(size * 0.6)} Z" fill="${color}" stroke="${color}" stroke-width="${num(strokeWidth * 0.5)}" stroke-linejoin="round"/>`,
    circle: `<circle cx="0" cy="0" r="${num(size * 0.5)}" fill="white" stroke="${color}" stroke-width="${num(strokeWidth)}"/>`,
    filled_circle: `<circle cx="0" cy="0" r="${num(size * 0.5)}" fill="${color}"/>`,
    diamond: `<path d="M ${num(-size * 0.6)} 0 L 0 ${num(-size * 0.6)} L ${num(size * 0.6)} 0 L 0 ${num(size * 0.6)} Z" fill="white" stroke="${color}" stroke-width="${num(strokeWidth)}"/>`,
    filled_diamond: `<path d="M ${num(-size * 0.6)} 0 L 0 ${num(-size * 0.6)} L ${num(size * 0.6)} 0 L 0 ${num(size * 0.6)} Z" fill="${color}" stroke="${color}" stroke-width="${num(strokeWidth * 0.5)}"/>`,
    bar: `<path d="M 0 ${num(-size * 0.6)} V ${num(size * 0.6)}" stroke="${color}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
    triangle: `<path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 L ${num(-size)} ${num(size * 0.72)} Z" fill="white" stroke="${color}" stroke-width="${num(strokeWidth)}" stroke-linejoin="round"/>`,
    one: `<path d="M 0 ${num(-size * 0.62)} V ${num(size * 0.62)} M ${num(-size * 0.72)} ${num(-size * 0.62)} V ${num(size * 0.62)}" stroke="${color}" stroke-width="${num(strokeWidth)}"/>`,
    zero_one: `<circle cx="${num(-size * 0.8)}" cy="0" r="${num(size * 0.38)}" fill="white" stroke="${color}" stroke-width="${num(strokeWidth)}"/><path d="M 0 ${num(-size * 0.62)} V ${num(size * 0.62)}" stroke="${color}" stroke-width="${num(strokeWidth)}"/>`,
    many: `<path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * 0.72)} L 0 0" stroke="${color}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
    one_many: `<path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * 0.72)} L 0 0 M ${num(-size * 1.45)} ${num(-size * 0.62)} V ${num(size * 0.62)}" stroke="${color}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
    zero_many: `<circle cx="${num(-size * 1.45)}" cy="0" r="${num(size * 0.38)}" fill="white" stroke="${color}" stroke-width="${num(strokeWidth)}"/><path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * 0.72)} L 0 0" stroke="${color}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
  };
  return bodies[type];
}
