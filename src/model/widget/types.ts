export type WidgetType = 'rollingNumber' | 'tickScale' | 'ruler';

export interface RollingNumberWidgetStyle {
  color?: string;
  surface?: string;
  divider?: string;
  labelColor?: string;
  fontFamily?: string;
  variant?: 'flip' | 'plain';
  motion?: 'roll' | 'fade';
  fontWeight?: string;
  fontSize?: number;
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
  labels?: { size?: number; color?: string; offset?: number; weight?: string; fontFamily?: string };
}

export interface RulerWidget {
  id: string;
  type: 'ruler';
  value: string;
  min?: number;
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
  labels?: { size?: number; color?: string; offset?: number; weight?: string; fontFamily?: string };
}

export type Widget = RollingNumberWidget | TickScaleWidget | RulerWidget;
