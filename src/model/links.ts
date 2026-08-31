import { hexToRgb, rgbToHex } from './colorConversion';
import type { GradientColor } from './colors';
import type { ShadowStyle } from './shadows';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export type PathType = 'straight' | 'curved' | 'orthogonal';

export type ArrowDirection = 'none' | 'forward' | 'backward' | 'bidirectional';

export type MarkerType =
  | 'none'
  | 'arrow'
  | 'filled_arrow'
  | 'circle'
  | 'filled_circle'
  | 'diamond'
  | 'filled_diamond'
  | 'bar'
  | 'triangle'
  | 'one'
  | 'zero_one'
  | 'many'
  | 'one_many'
  | 'zero_many';

export type RelationPreset =
  | 'custom'
  | 'uml_association'
  | 'uml_directed_association'
  | 'uml_dependency'
  | 'uml_aggregation'
  | 'uml_composition'
  | 'uml_generalization'
  | 'uml_realization'
  | 'er_one_one'
  | 'er_zero_one'
  | 'er_one_many'
  | 'er_zero_many';

export interface LinkStyle {
  color?: string | GradientColor;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  pathType?: PathType;
  arrowDirection?: ArrowDirection;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  shadow?: ShadowStyle;
  relationPreset?: RelationPreset;
  startLabel?: string;
  endLabel?: string;
}

export function getLinkStrokeColor(
  colorValue: LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined,
): string | undefined {
  if (!colorValue) return undefined;
  if (typeof colorValue === 'string') return colorValue;
  if (colorValue.type === 'gradient') return colorValue.stops?.[0]?.color;
  if (colorValue.type === 'solid') return colorValue.color;
  return undefined;
}

export function getLinkEndpointColor(
  colorValue: LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined,
  end: 'start' | 'end',
): string | undefined {
  if (colorValue && typeof colorValue === 'object' && colorValue.type === 'gradient' && colorValue.stops?.length) {
    const stops = colorValue.stops;
    return end === 'start' ? stops[0].color : stops[stops.length - 1].color;
  }
  return getLinkStrokeColor(colorValue);
}

function mixHexColors(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return rgbToHex(
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t),
  );
}

function getGradientColorAtPosition(stops: GradientColor['stops'], position: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (position <= first.position) return first.color;
  if (position >= last.position) return last.color;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (position >= a.position && position <= b.position) {
      const t = b.position === a.position ? 0 : (position - a.position) / (b.position - a.position);
      return mixHexColors(a.color, b.color, t);
    }
  }
  return last.color;
}

export function getLinkColorAtPoint(
  colorValue: LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined,
  points: number[],
  point: { x: number; y: number },
): string | undefined {
  if (colorValue && typeof colorValue === 'object' && colorValue.type === 'gradient' && colorValue.stops?.length) {
    if (points.length < 4) return colorValue.stops[0]?.color;

    const axisStart = { x: points[0], y: points[1] };
    const axisEnd = { x: points[points.length - 2], y: points[points.length - 1] };
    const dx = axisEnd.x - axisStart.x;
    const dy = axisEnd.y - axisStart.y;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq === 0
        ? 0
        : Math.max(0, Math.min(1, ((point.x - axisStart.x) * dx + (point.y - axisStart.y) * dy) / lengthSq));

    return getGradientColorAtPosition(colorValue.stops, t * 100);
  }
  return getLinkStrokeColor(colorValue);
}

export interface Link {
  id: string;
  name?: string;
  fromId: string;
  toId: string;
  weight?: number;
  showWeight?: boolean;
  text?: string;
  showText?: boolean;
  style?: LinkStyle;
  fromPoint?:
    | { side: 'top' | 'right' | 'bottom' | 'left'; offset?: number }
    | { x: number; y: number; isAbsolute: true }
    | { port: string; isPort: true };
  toPoint?:
    | { side: 'top' | 'right' | 'bottom' | 'left'; offset?: number }
    | { x: number; y: number; isAbsolute: true }
    | { port: string; isPort: true };

  segmentOffsets?: number[];

  waypoints?: Array<{ x: number; y: number }>;

  startMarker?: MarkerType;
  endMarker?: MarkerType;
  start_marker?: MarkerType;
  end_marker?: MarkerType;

  layer_group: string;
  layerGroup?: string;
  order_key: string;
  orderKey?: string;
  is_visible: boolean;
  isVisible?: boolean;
  is_locked: boolean;
  isLocked?: boolean;

  parent_frame_id?: string;
  parentFrameId?: string;

  parent_swimlane_id?: string;
  lane_id?: string;
}
