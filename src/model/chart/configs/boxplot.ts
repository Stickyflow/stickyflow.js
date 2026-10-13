import type { GradientColor, MeshGradientColor } from '../../color';
export interface BoxplotChartConfig {
  boxWidth?: number;
  orientation?: 'horizontal' | 'vertical';
  barCornerRadius?: number;
  showBoxplotPoints?: boolean;
  barBorderColor?: string | GradientColor | MeshGradientColor;
  barBorderWidth?: number;
}
