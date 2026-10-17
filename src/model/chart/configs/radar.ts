import type { CategoryChartConfig } from './category';

export interface RadarChartConfig extends CategoryChartConfig {
  areaOpacity?: number;
  radarStrokeWidth?: number;
  radarPointSize?: number;
  radarSpokes?: boolean;
  radarTension?: number;
}
