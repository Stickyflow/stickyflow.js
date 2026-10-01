export interface Frame {
  id: string;
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
  label_position?: 'top' | 'bottom' | 'left' | 'right';
  shadow?: boolean;
  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;
}
