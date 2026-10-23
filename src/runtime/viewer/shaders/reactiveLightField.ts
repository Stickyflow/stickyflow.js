import type { ShaderParameter } from '../../../model/shader';
import type { Surface } from './surfaceTypes';
import { color, number } from './uniforms';

interface SurfaceGeometry {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  localPoint(worldX: number, worldY: number): [number, number];
}

function geometryOf(surface: Surface): SurfaceGeometry | undefined {
  const x = Number(surface.owner.getAttribute('x'));
  const y = Number(surface.owner.getAttribute('y'));
  const width = Number(surface.owner.getAttribute('width'));
  const height = Number(surface.owner.getAttribute('height'));
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return undefined;
  }
  const matrix = (surface.owner as SVGGraphicsElement).getCTM?.();
  const a = matrix?.a ?? 1;
  const b = matrix?.b ?? 0;
  const c = matrix?.c ?? 0;
  const d = matrix?.d ?? 1;
  const e = matrix?.e ?? 0;
  const f = matrix?.f ?? 0;
  const determinant = a * d - b * c;
  const centerX = a * (x + width / 2) + c * (y + height / 2) + e;
  const centerY = b * (x + width / 2) + d * (y + height / 2) + f;
  const localPoint = (worldX: number, worldY: number): [number, number] => {
    if (Math.abs(determinant) < 0.000001) {
      return [worldX, worldY];
    }
    const translatedX = worldX - e;
    const translatedY = worldY - f;
    return [(d * translatedX - c * translatedY) / determinant, (-b * translatedX + a * translatedY) / determinant];
  };
  return { width, height, centerX, centerY, localPoint };
}

function parameter(parameters: Record<string, ShaderParameter>, key: string, fallback: number): number {
  return number(parameters[key], fallback);
}

export function normalizedLightPosition(
  sourceX: number,
  sourceY: number,
  receiverX: number,
  receiverY: number,
  receiverWidth: number,
  receiverHeight: number,
): [number, number] {
  return [(sourceX - receiverX) / receiverWidth, (sourceY - receiverY) / receiverHeight];
}

export function updateReactiveLightFields(surfaces: Surface[]): void {
  const reactive = surfaces
    .filter(surface => surface.owner.getAttribute('data-sf-shader') === 'reactivePanel')
    .flatMap(surface => {
      const geometry = geometryOf(surface);
      return geometry ? [{ surface, geometry }] : [];
    });

  for (const receiver of reactive) {
    const sources: Array<{ candidate: (typeof reactive)[number]; emission: number; weight: number }> = [];
    for (const candidate of reactive) {
      if (candidate.surface === receiver.surface) {
        continue;
      }
      const emission = Math.max(
        0,
        candidate.surface.smoothed.get('emission') ?? parameter(candidate.surface.parameters, 'emission', 0),
      );
      if (emission <= 0.0001) {
        continue;
      }
      const distance = Math.hypot(
        candidate.geometry.centerX - receiver.geometry.centerX,
        candidate.geometry.centerY - receiver.geometry.centerY,
      );
      sources.push({ candidate, emission, weight: emission / Math.max(distance, 1) });
    }
    const totalWeight = sources.reduce((sum, source) => sum + source.weight, 0);
    if (totalWeight <= 0) {
      receiver.surface.reactiveLight = undefined;
      continue;
    }
    let worldX = 0;
    let worldY = 0;
    let sourceEmission = 0;
    let radius = 0;
    const lightColor: [number, number, number] = [0, 0, 0];
    for (const source of sources) {
      const influence = source.weight / totalWeight;
      worldX += source.candidate.geometry.centerX * influence;
      worldY += source.candidate.geometry.centerY * influence;
      sourceEmission += source.emission;
      radius += Math.max(1, parameter(source.candidate.surface.parameters, 'glowRadius', 90)) * influence;
      const sourceColor = color(source.candidate.surface.parameters.lightColor, [0.35, 0.82, 1]);
      lightColor[0] += sourceColor[0] * influence;
      lightColor[1] += sourceColor[1] * influence;
      lightColor[2] += sourceColor[2] * influence;
    }
    const receiverStrength = Math.max(0, parameter(receiver.surface.parameters, 'lightStrength', 1));
    const [sourceX, sourceY] = receiver.geometry.localPoint(worldX, worldY);
    const receiverX = Number(receiver.surface.owner.getAttribute('x'));
    const receiverY = Number(receiver.surface.owner.getAttribute('y'));
    const [lightX, lightY] = normalizedLightPosition(
      sourceX,
      sourceY,
      receiverX,
      receiverY,
      receiver.geometry.width,
      receiver.geometry.height,
    );
    receiver.surface.reactiveLight = {
      x: lightX,
      y: lightY,
      strength: sourceEmission * receiverStrength * 1.8,
      radius,
      color: lightColor,
    };
  }
}
