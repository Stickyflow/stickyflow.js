export type WidgetType = 'rollingNumber';

export interface RollingNumberWidgetStyle {
  color?: string;
  surface?: string;
  divider?: string;
  labelColor?: string;
  fontFamily?: string;
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
