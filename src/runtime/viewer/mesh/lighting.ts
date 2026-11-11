import type { MeshLight, Vec3 } from '../../../model/mesh';
import { normalize } from './matrix';

const SUN_STRENGTH = 2.8;
const HIGHEST = 85;
const NOON: Vec3 = [0.78, 0.82, 0.9];
const DUSK: Vec3 = [1.05, 0.72, 0.58];
const FLOOR: Vec3 = [0.16, 0.15, 0.14];
const LOW_SUN: Vec3 = [1, 0.55, 0.3];

// What the shader needs to know about the light. The sky and the floor follow the sun, so a scene at dusk is warm all over.
export interface Lighting {
  direction: Vec3;
  sun: Vec3;
  // The sun as it is seen in a reflection, without its strength.
  glare: Vec3;
  sky: Vec3;
  floor: Vec3;
  fill: number;
  // How strong an environment picture lights the world.
  ambient: number;
  // How large the sun looks, in degrees, when the document says so.
  softness?: number;
  // How much of a shadow can be seen: none when the sun is down.
  shadow: number;
  // On the page around the world, where a long shadow of a low sun would only be a wedge across the drawing.
  groundShadow: number;
}

export function colorOf(hex: string | undefined): [number, number, number] | undefined {
  const digits = hex?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!digits) {
    return undefined;
  }
  const full = digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits;
  // sRGB to linear, as the lights work in linear values.
  return [0, 2, 4].map(start => (Number.parseInt(full.slice(start, start + 2), 16) / 255) ** 2.2) as [
    number,
    number,
    number,
  ];
}

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((value, axis) => value + (b[axis] - value) * t) as Vec3;
const times = (a: Vec3, factor: number): Vec3 => a.map(value => value * factor) as Vec3;

export function lightingOf({ turn, height, color, intensity, ambient, softness }: MeshLight): Lighting {
  const yaw = (turn * Math.PI) / 180;
  const pitch = (Math.min(HIGHEST, height) * Math.PI) / 180;
  const direction = normalize([Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]);
  const rise = direction[1];
  const up = smoothstep(-0.1, 0.3, rise);
  const above = smoothstep(-0.02, 0.08, rise);
  const tint = mix(LOW_SUN, [1, 1, 1], smoothstep(0, 0.4, rise));
  const own = colorOf(color) ?? [1, 1, 1];
  const glare = own.map((value, axis) => value * tint[axis] * intensity * above) as Vec3;
  return {
    direction,
    sun: times(glare, SUN_STRENGTH),
    glare,
    sky: times(mix(DUSK, NOON, smoothstep(0, 0.6, rise)), (0.25 + 0.75 * up) * ambient),
    floor: times(FLOOR, (0.4 + 0.6 * up) * ambient),
    fill: 0.5 * ambient * (0.25 + 0.75 * up),
    ambient,
    softness,
    shadow: above,
    groundShadow: above * smoothstep(0.05, 0.35, rise),
  };
}
