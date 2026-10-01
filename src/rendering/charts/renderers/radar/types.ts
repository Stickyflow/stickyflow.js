import type { RadarChart, RadialChart } from '../../../../model/chart';

export type RadarFamilyChart = RadarChart | RadialChart;

export interface RadarPoint {
  x: number;
  y: number;
}

export interface RadarGeometry {
  circular: boolean;
  areaOpacity: number;
  categories: string[];
  centerX: number;
  centerY: number;
  radius: number;
  radiusForValue: (value: number) => number;
  pointAt: (radius: number, index: number) => RadarPoint;
  polygonPath: (radius: number) => string;
}
