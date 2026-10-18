export interface RollingNumberComponentStyle {
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

export interface RollingNumberComponent {
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
  style: RollingNumberComponentStyle;
}

export interface TickScaleComponent {
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

export interface RulerComponent {
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

export type Component = RollingNumberComponent | TickScaleComponent | RulerComponent;
