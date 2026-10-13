import type { ShadowStyle } from '../shadow';

export interface Lane {
  id: string;
  label: string;
  size: number;
  color?: string | null;
}

export interface Swimlane {
  id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  orientation: 'horizontal' | 'vertical';
  lanes: Lane[];
  strokeColor: string;
  strokeWidth: number;
  dash?: number[];
  cornerRadius: number;
  fillColor: string;
  shadowStyle?: ShadowStyle;
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontFamily?: string;
  showLaneLabels: boolean;
  layerGroup?: string;
  orderKey?: string;
  order?: number;
  sourceIndex?: number;
  isVisible?: boolean;
  isLocked?: boolean;
}
