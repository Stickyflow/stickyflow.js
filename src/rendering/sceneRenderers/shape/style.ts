import type { Shape } from '../../../model/shapes';
import { SHAPE_DEFAULTS } from '../../../model/shapes';
import { finite, paint } from '../../renderPrimitives';
import type { RenderDiagnostic, SceneStyle } from '../../scene';

export function shapeDefaults(
  shape: Shape,
  diagnostics: RenderDiagnostic[],
): (typeof SHAPE_DEFAULTS)[keyof typeof SHAPE_DEFAULTS] {
  const defaults = SHAPE_DEFAULTS[shape.shapeType as keyof typeof SHAPE_DEFAULTS];
  if (defaults) {
    return defaults;
  }
  diagnostics.push({
    severity: 'warning',
    code: 'unknown-shape-type',
    entityId: shape.id,
    message: `Unknown shapeType '${shape.shapeType}', falling back to rectangle defaults.`,
  });
  return SHAPE_DEFAULTS.rectangle;
}

function shapeDash(shape: Shape, strokeWidth: number): number[] | undefined {
  if (shape.shapeType === 'container_rectangle') {
    return [10, 5];
  }
  if (shape.strokeStyle === 'dotted') {
    return [0.001, strokeWidth * 2];
  }
  if (shape.strokeStyle === 'dashed') {
    return [strokeWidth * 4, strokeWidth * 2];
  }
  return shape.dash?.length ? shape.dash : undefined;
}

export function shapeStyle(shape: Shape, diagnostics: RenderDiagnostic[]): SceneStyle {
  const defaults = shapeDefaults(shape, diagnostics);
  const strokeWidth = finite(shape.strokeWidth, defaults.strokeWidth);
  const shadow =
    shape.shadowStyle ??
    (shape.hasShadow
      ? { enabled: true, color: '#000000', opacity: 0.25, blur: 10, angle: 45, distance: 5 }
      : undefined);
  const angle = (finite(shadow?.angle, 45) * Math.PI) / 180;
  return {
    fill: paint(shape.fillColor, diagnostics, shape.id),
    stroke: paint(shape.strokeColor, diagnostics, shape.id),
    strokeWidth,
    dash: shapeDash(shape, strokeWidth),
    lineCap: shape.strokeStyle === 'dotted' ? 'round' : 'butt',
    opacity: finite(shape.shapeStyle?.opacity, 1),
    shadow: shadow?.enabled
      ? {
          color: shadow.color,
          opacity: finite(shadow.opacity, 0.25),
          blur: finite(shadow.blur, 10),
          dx: Math.cos(angle) * finite(shadow.distance, 5),
          dy: Math.sin(angle) * finite(shadow.distance, 5),
        }
      : undefined,
  };
}
