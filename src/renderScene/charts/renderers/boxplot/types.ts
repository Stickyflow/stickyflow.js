export type BoxplotOrientation = 'horizontal' | 'vertical';

export interface BoxplotLayout {
  orientation: BoxplotOrientation;
  slotWidth: number;
  boxWidth: number;
  cornerRadius: number;
  showPoints: boolean;
  borderColor: string;
  borderWidth: number;
}

export interface BoxplotGeometry {
  center: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface BoxplotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface BoxplotSeriesMark {
  id: string;
  series: ChartSeries;
  seriesIndex: number;
  color: NonNullable<ChartSeries['color']>;
  geometry: BoxplotGeometry;
}

import type { ChartSeries } from '../../../../model/chart';
