import type { ShaderParameter } from '../../../model/shader';
import type { Surface } from './surfaceTypes';

export function color(
  value: ShaderParameter | undefined,
  fallback: [number, number, number],
): [number, number, number] {
  if (typeof value !== 'string') {
    return fallback;
  }
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) {
    return fallback;
  }
  const integer = Number.parseInt(match[1], 16);
  return [((integer >> 16) & 255) / 255, ((integer >> 8) & 255) / 255, (integer & 255) / 255];
}

export function number(value: ShaderParameter | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function uniform1f(surface: Surface, name: string, value: number): void {
  const location = surface.gl.getUniformLocation(surface.program, name);
  if (location) {
    surface.gl.uniform1f(location, value);
  }
}

export function uniform3f(surface: Surface, name: string, value: [number, number, number]): void {
  const location = surface.gl.getUniformLocation(surface.program, name);
  if (location) {
    surface.gl.uniform3f(location, ...value);
  }
}

export function uniform2f(surface: Surface, name: string, value: [number, number]): void {
  const location = surface.gl.getUniformLocation(surface.program, name);
  if (location) {
    surface.gl.uniform2f(location, ...value);
  }
}

export function uniformName(parameter: string): string {
  return `u${parameter.charAt(0).toUpperCase()}${parameter.slice(1)}`;
}

function enumParameter(name: string, value: string): number | undefined {
  const values: Record<string, Record<string, number>> = {
    direction: { left: 0, right: 1, top: 2, bottom: 3 },
    orientation: { vertical: 0, horizontal: 1 },
    axis: { vertical: 0, horizontal: 1 },
  };
  return values[name]?.[value];
}

export function applyParameters(surface: Surface, elapsed: number): void {
  for (const [key, value] of Object.entries(surface.parameters)) {
    const name = uniformName(key);
    if (typeof value === 'number') {
      const lag = surface.parameters[`${key}Lag`];
      if (typeof lag === 'number' && lag > 0) {
        const current = surface.smoothed.get(key) ?? value;
        const next = current + (value - current) * (1 - Math.exp(-elapsed / lag));
        surface.smoothed.set(key, next);
        uniform1f(surface, name, next);
        continue;
      }
      uniform1f(surface, name, value);
      continue;
    }
    if (typeof value === 'boolean') {
      const location = surface.gl.getUniformLocation(surface.program, name);
      if (location) {
        surface.gl.uniform1i(location, value ? 1 : 0);
      }
      continue;
    }
    const enumValue = enumParameter(key, value);
    if (enumValue !== undefined) {
      uniform1f(surface, name, enumValue);
      continue;
    }
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      uniform3f(surface, name, color(value, [0, 0, 0]));
    }
  }
}
