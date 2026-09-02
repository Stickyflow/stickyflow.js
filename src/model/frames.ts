export interface Frame {
  id: string;
  board_id?: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;

  stroke_color: string;
  stroke_width: number;
  dash?: number[];
  corner_radius: number;
  fill_color: string;

  text_color: string;
  font_size: number;
  font_weight: 'normal' | 'bold';
  font_family?: string;
  show_label: boolean;

  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;

  entity_group_id?: string | null;

  created_at?: string;
  updated_at?: string | null;
}

export interface FrameCreate {
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string | null;
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  corner_radius?: number;
  fill_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  font_family?: string;
  show_label?: boolean;
  layer_group?: string;
  order_key?: string;
  entity_group_id?: string | null;
}

export interface FrameUpdate {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  title?: string | null;
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  corner_radius?: number;
  fill_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  font_family?: string;
  show_label?: boolean;
  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;
  entity_group_id?: string | null;
}

export const FRAME_DEFAULTS = {
  width: 400,
  height: 300,
  title: 'User Flow',
  stroke_color: '#9b42df',
  stroke_width: 2,
  dash: [],
  corner_radius: 12,
  fill_color: 'rgba(155, 66, 223, 0.05)',
  text_color: '#9b42df',
  font_size: 14,
  font_weight: 'bold' as const,
  font_family: "'Inter', sans-serif",
  show_label: true,
  layer_group: 'background',
  order_key: 'e',
};
