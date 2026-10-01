import type { GradientColor } from '../color';
import type { ShadowStyle } from '../shadow';

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

export type LinkEndpoint =
  | { side: 'top' | 'right' | 'bottom' | 'left'; offset?: number }
  | { x: number; y: number; isAbsolute: true }
  | { port: string; isPort: true };

export interface Link {
  id: string;
  name?: string;
  fromId?: string;
  toId?: string;
  weight?: number;
  showWeight?: boolean;
  text?: string;
  showText?: boolean;
  style?: LinkStyle;
  fromPoint?: LinkEndpoint;
  toPoint?: LinkEndpoint;
  segmentOffsets?: number[];
  waypoints?: Array<{ x: number; y: number }>;
  startMarker?: MarkerType;
  endMarker?: MarkerType;
  start_marker?: MarkerType;
  end_marker?: MarkerType;
  layer_group?: string;
  layerGroup?: string;
  order_key?: string;
  orderKey?: string;
  is_visible?: boolean;
  isVisible?: boolean;
  is_locked?: boolean;
  isLocked?: boolean;
  parent_frame_id?: string;
  parentFrameId?: string;
  parent_swimlane_id?: string;
  lane_id?: string;
}
