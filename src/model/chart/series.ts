import type { GradientColor, MeshGradientColor } from '../color/types';

export interface ChartSeries {
  id: string;
  label: string;
  color?: string | GradientColor | MeshGradientColor;
  colors?: Array<string | GradientColor | MeshGradientColor | null>;
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
