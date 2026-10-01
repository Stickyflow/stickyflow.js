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
  | { kind: 'side'; side: 'top' | 'right' | 'bottom' | 'left'; offset?: number }
  | { kind: 'absolute'; x: number; y: number }
  | { kind: 'port'; port: string };

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
  layerGroup?: string;
  orderKey?: string;
  order?: number;
  isVisible?: boolean;
  isLocked?: boolean;
  parentFrameId?: string;
  parentSwimlaneId?: string;
  laneId?: string;
}
