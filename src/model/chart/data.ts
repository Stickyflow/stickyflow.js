import type { GradientColorObject, MeshGradientObject } from '../color/types';

export interface ChartAxis {
  min: number;
  max: number;
  step: number;
  label?: string;
  unit?: string;
  thresholds?: number[];
}

export interface ChartZone {
  label: string;
  color?: string;
}

export interface ChartRamp {
  type: 'ramp';
  stops: Array<{ position: number; color: string }>;
}

export interface ChartSeries {
  id: string;
  label: string;
  color?: string | GradientColorObject | MeshGradientObject;
  colors?: Array<string | GradientColorObject | MeshGradientObject | null>;
  opacity?: number;
  group?: string;
  values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][];
  error?: Array<number | [number, number] | null>;
  source?: string;
  target?: string;
  size?: number;
  symbol?: { points: Array<[number, number]>; normalized?: boolean; tension?: number };
  stroke?: string;
  stroke_width?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

export interface ChartRule {
  id: string;
  at: number;
  text?: string;
  color?: string;
  stroke_width?: number;
  dash?: number[];
}
