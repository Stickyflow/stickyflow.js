import type { ChartZone } from '../annotations';
import type { CategoryChartConfig } from './category';

export interface CustomChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  orientation?: 'horizontal' | 'vertical';
  connectPoints?: boolean;
  reverseComparison?: boolean;
  customConnectorWidth?: number;
  customConnectorOpacity?: number;
  customConnectorDash?: string;
  customBeforeFill?: string;
  customBeforeStroke?: string;
  customBeforeStrokeWidth?: number;
  customLabelSize?: number;
  customLabelColor?: string;
}
