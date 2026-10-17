import { formatColorAlpha, parseColorAlpha } from './color';

export interface GradientStopValue {
  color: string;
  position: number;
}

export interface GradientValue {
  angle: number;
  stops: GradientStopValue[];
}

export const DEFAULT_GRADIENT_ANGLE = 90;

const GRADIENT = /^gradient\(\s*(-?[\d.]+)\s*,\s*(.+)\)\s*$/i;
const STOP = /(rgba?\([^)]*\)|#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s+(-?[\d.]+)%/gi;

function trim(value: number): number {
  return Number(value.toFixed(1));
}

export function clampPosition(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function sortStops(stops: readonly GradientStopValue[]): GradientStopValue[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

export function parseGradient(source: string): GradientValue | null {
  const match = source.trim().match(GRADIENT);
  if (!match) {
    return null;
  }
  const angle = Number(match[1]);
  if (!Number.isFinite(angle)) {
    return null;
  }
  const stops: GradientStopValue[] = [];
  for (const stop of match[2].matchAll(STOP)) {
    const parsed = parseColorAlpha(stop[1]);
    const position = Number(stop[2]);
    if (parsed && Number.isFinite(position)) {
      stops.push({ color: formatColorAlpha(parsed.hex, parsed.alpha), position: clampPosition(position) });
    }
  }
  return stops.length >= 2 ? { angle, stops } : null;
}

export function formatGradient(value: GradientValue): string {
  const stops = sortStops(value.stops)
    .map(stop => `${stop.color} ${trim(clampPosition(stop.position))}%`)
    .join(', ');
  return `gradient(${trim(value.angle)}, ${stops})`;
}

export function gradientCss(value: GradientValue): string {
  const stops = sortStops(value.stops)
    .map(stop => `${stop.color} ${clampPosition(stop.position)}%`)
    .join(', ');
  return `linear-gradient(${trim(value.angle + 90)}deg, ${stops})`;
}
