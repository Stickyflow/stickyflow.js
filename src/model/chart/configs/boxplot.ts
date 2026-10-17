import type { GradientColor, MeshGradientColor } from '../../color';
export interface BoxplotChartConfig {
  boxWidth?: number;
  orientation?: 'horizontal' | 'vertical';
  barCornerRadius?: number;
  showBoxplotPoints?: boolean;
  barBorderColor?: string | GradientColor | MeshGradientColor;
  barBorderWidth?: number;
  boxWhiskerWidth?: number;
  boxMedianWidth?: number;
  boxMedianColor?: string;
  boxWhiskerColor?: string;
  boxCapSize?: number;
  boxPointSize?: number;
  boxPointOpacity?: number;
  boxJitter?: number;
}
