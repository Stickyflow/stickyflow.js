import type { ShadowStyle } from '../../model/shadows';

const COLOR = String.raw`rgba?\([^)]*\)|#[0-9a-fA-F]+|[a-zA-Z][\w-]*`;

export interface GradientStop {
  position: number;
  color: string;
}
export interface GradientFill {
  type: 'gradient';
  angle: number;
  stops: GradientStop[];
}
export interface MeshPoint {
  id: string;
  x: number;
  y: number;
  color: string;
}
export interface MeshFill {
  type: 'mesh';
  points: MeshPoint[];
}
export type DecodedColor = string | GradientFill | MeshFill;

export function decodeColor(s?: string): DecodedColor | undefined {
  if (s === undefined || s === null || s === '') return undefined;

  const grad = s.match(/^gradient\(\s*([-\d.]+)\s*,\s*(.*)\)\s*$/);
  if (grad) {
    const angle = Number(grad[1]);
    const stops: GradientStop[] = [];
    const re = new RegExp(`(${COLOR})\\s+([-\\d.]+)%`, 'g');
    for (const m of grad[2].matchAll(re)) stops.push({ color: m[1], position: Number(m[2]) });
    return { type: 'gradient', angle, stops };
  }

  const mesh = s.match(/^mesh\(\s*(.*)\)\s*$/);
  if (mesh) {
    const points: MeshPoint[] = [];
    const re = new RegExp(`(${COLOR})\\s+([-\\d.]+)\\s*,\\s*([-\\d.]+)`, 'g');
    let i = 0;
    for (const m of mesh[1].matchAll(re)) {
      points.push({ id: `mp-${Date.now()}-${i++}`, color: m[1], x: Number(m[2]), y: Number(m[3]) });
    }
    return { type: 'mesh', points };
  }

  return s;
}

export interface RampStop {
  position: number;
  color: string;
}
export interface DecodedRamp {
  type: 'ramp';
  stops: RampStop[];
}

export function decodeRamp(s?: string): DecodedRamp | undefined {
  if (!s) return undefined;
  const m = s.match(/^ramp\(\s*(.*)\)\s*$/);
  if (!m) return undefined;
  const stops: RampStop[] = [];
  const re = new RegExp(`(${COLOR})\\s+([-\\d.]+)`, 'g');
  for (const stop of m[1].matchAll(re)) stops.push({ color: stop[1], position: Number(stop[2]) });
  return { type: 'ramp', stops };
}

export function decodeShadow(s?: string): ShadowStyle | undefined {
  if (!s) return undefined;
  if (s === 'on') return { enabled: true };
  const m = s.match(/^shadow\((.*)\)\s*$/);
  if (!m) return undefined;
  const out: ShadowStyle = { enabled: true };
  for (const part of m[1].split(',')) {
    const kv = part.split(':');
    if (kv.length !== 2) continue;
    const key = kv[0].trim();
    const val = kv[1].trim();
    if (key === 'color') out.color = val;
    else if (key === 'opacity') out.opacity = Number(val);
    else if (key === 'blur') out.blur = Number(val);
    else if (key === 'angle') out.angle = Number(val);
    else if (key === 'distance') out.distance = Number(val);
  }
  return out;
}
