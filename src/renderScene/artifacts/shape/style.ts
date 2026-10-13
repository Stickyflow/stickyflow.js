import type { Shape, ShapeType } from '../../../model/shape';
import type { RenderDiagnostic, SceneStyle } from '../../scene';
import { finite, paint } from '../../scene';

const REMOVED_SHAPE_HINTS: Record<string, string> = {
  container_rectangle: " (use 'rectangle' with strokeStyle: dashed)",
};

const COMMON_SHAPE_DEFAULTS = {
  strokeColor: '#cbd5e1',
  strokeWidth: 2,
  fillColor: '#ffffff',
  dash: [],
  strokeStyle: 'solid' as const,
  fontSize: 14,
  fontWeight: 'normal' as const,
  textAlign: 'center' as const,
  textVerticalAlign: 'middle' as const,
  lineHeight: 1.3,
  hasShadow: false,
  opacity: 1,
};

interface ShapeRenderDefaults {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  dash: readonly number[];
  strokeStyle: 'solid';
  fontSize: number;
  fontWeight: 'normal';
  textAlign: 'center';
  textVerticalAlign: 'middle';
  lineHeight: number;
  hasShadow: boolean;
  opacity: number;
  cornerRadius?: number;
  rotation?: number;
}

const SHAPE_RENDER_DEFAULTS = {
  rectangle: COMMON_SHAPE_DEFAULTS,
  rounded_rectangle: { ...COMMON_SHAPE_DEFAULTS, cornerRadius: 8 },
  triangle: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  diamond: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  hexagon: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  oval: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  circle: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  document: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  parallelogram: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  trapezoid: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  cylinder: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  note: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  cloud: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  predefined_process: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  pill: COMMON_SHAPE_DEFAULTS,
  person: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
  symbol: { ...COMMON_SHAPE_DEFAULTS, rotation: 0 },
} as const satisfies Record<ShapeType, ShapeRenderDefaults>;

export function shapeDefaults(
  shape: Shape,
  diagnostics: RenderDiagnostic[],
): (typeof SHAPE_RENDER_DEFAULTS)[keyof typeof SHAPE_RENDER_DEFAULTS] {
  const defaults = SHAPE_RENDER_DEFAULTS[shape.shapeType as keyof typeof SHAPE_RENDER_DEFAULTS];
  if (defaults) {
    return defaults;
  }
  diagnostics.push({
    severity: 'warning',
    code: 'unknown-shape-type',
    ownerId: shape.id,
    message: `Unknown shapeType '${shape.shapeType}'${REMOVED_SHAPE_HINTS[shape.shapeType] ?? ''}, falling back to rectangle defaults.`,
  });
  return SHAPE_RENDER_DEFAULTS.rectangle;
}

function shapeDash(shape: Shape, strokeWidth: number): number[] | undefined {
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
    opacity: finite(shape.opacity, defaults.opacity),
    shadow: shadow?.enabled
      ? {
          color: shadow.color ?? '#000000',
          opacity: finite(shadow.opacity, 0.25),
          blur: finite(shadow.blur, 10),
          dx: Math.cos(angle) * finite(shadow.distance, 5),
          dy: Math.sin(angle) * finite(shadow.distance, 5),
        }
      : undefined,
  };
}
