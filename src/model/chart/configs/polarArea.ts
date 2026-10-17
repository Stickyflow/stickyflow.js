import type { PieChartConfig } from './pie';

export interface PolarAreaChartConfig extends PieChartConfig {
  polarTrackOpacity?: number;
  polarRings?: boolean;
  polarTrackStroke?: string;
  polarTrackStrokeWidth?: number;
  polarTrackDash?: string;
  polarValueSize?: number;
  polarNameSize?: number;
  polarValueFirst?: boolean;
  polarOutsideLabels?: boolean;
}
