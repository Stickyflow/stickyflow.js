export interface Frame {
  id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  strokeColor: string;
  strokeWidth: number;
  dash?: number[];
  cornerRadius: number;
  fillColor: string;
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontFamily?: string;
  showLabel: boolean;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  shadow?: boolean;
  layerGroup?: string;
  orderKey?: string;
  order?: number;
  isVisible?: boolean;
  isLocked?: boolean;
}
