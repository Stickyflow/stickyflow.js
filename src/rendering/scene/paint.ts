import type { GradientColorObject, MeshGradientObject } from '../../model/shapes';
import type { RenderDiagnostic, ScenePaint } from './types';

export function paint(
  value: string | GradientColorObject | MeshGradientObject | null | undefined,
  diagnostics: RenderDiagnostic[],
  entityId: string,
): ScenePaint {
  if (!value) {
    return { kind: 'none' };
  }
  if (typeof value === 'string') {
    return { kind: 'solid', color: value };
  }
  if (value.type === 'gradient') {
    return {
      kind: 'linear-gradient',
      angle: value.angle,
      stops: value.stops.map(stop => ({ offset: stop.position, color: stop.color })),
    };
  }
  if (value.points.length === 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'empty-mesh-gradient',
      entityId,
      message: 'Mesh gradient has no color points.',
    });
    return { kind: 'none' };
  }
  return {
    kind: 'mesh-gradient',
    points: value.points.map(point => ({ x: point.x, y: point.y, color: point.color })),
  };
}
