import type { ShadowStyle } from '../shadow';

export interface Lane {
  id: string;
  label: string;
  size: number;
  color?: string | null;
}

export interface Swimlane {
  id: string;
  board_id?: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  orientation: 'horizontal' | 'vertical';
  lanes: Lane[];
  stroke_color: string;
  stroke_width: number;
  dash?: number[];
  corner_radius: number;
  fill_color: string;
  shadow_style?: ShadowStyle;
  text_color: string;
  font_size: number;
  font_weight: 'normal' | 'bold';
  font_family?: string;
  show_lane_labels: boolean;
  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;
  entity_group_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface SwimlaneCreate {
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string | null;
  orientation?: 'horizontal' | 'vertical';
  lanes?: Lane[];
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  corner_radius?: number;
  fill_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  font_family?: string;
  show_lane_labels?: boolean;
  layer_group?: string;
  order_key?: string;
  entity_group_id?: string | null;
}

export interface SwimlaneUpdate {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  title?: string | null;
  orientation?: 'horizontal' | 'vertical';
  lanes?: Lane[];
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  corner_radius?: number;
  fill_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  font_family?: string;
  show_lane_labels?: boolean;
  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;
  entity_group_id?: string | null;
}
