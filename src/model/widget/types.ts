export type WidgetType = 'rollingNumber' | 'tickScale';

export interface RollingNumberWidgetStyle {
  color?: string;
  surface?: string;
  divider?: string;
  labelColor?: string;
  fontFamily?: string;
  // 'plain' draws bare digits without cells, dividers or surface.
  variant?: 'flip' | 'plain';
  // 'fade' changes a digit in place with a soft cross-fade instead of rolling it.
  motion?: 'roll' | 'fade';
  fontWeight?: string;
}

export interface RollingNumberWidget {
  id: string;
  type: 'rollingNumber';
  value: string;
  digits?: number;
  duration?: number;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  order?: number;
  sourceIndex?: number;
  parentFrameId?: string;
  style: RollingNumberWidgetStyle;
}

// A ring of tick marks along a gauge arc. It is drawn by the tickScale shader; the value lights the ticks up to value / max.
export interface TickScaleWidget {
  id: string;
  type: 'tickScale';
  value: string;
  max?: number;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  order?: number;
  sourceIndex?: number;
  parentFrameId?: string;
  parameters: Record<string, string | number>;
  // Numbers next to the major ticks; present when the style says labels: true.
  labels?: { size?: number; color?: string; offset?: number; weight?: string; fontFamily?: string };
}

export type Widget = RollingNumberWidget | TickScaleWidget;
