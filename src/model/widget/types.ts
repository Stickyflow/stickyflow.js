export type WidgetType = 'rollingNumber';

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

export type Widget = RollingNumberWidget;
