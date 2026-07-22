
export interface ColorStop {
  position: number; // 0-100 (percentage)
  color: string;
}

export interface SolidColor {
  type: 'solid';
  color: string;
}

export interface GradientColor {
  type: 'gradient';
  angle: number; // 0-360 degrees
  stops: ColorStop[];
}

export interface MeshPoint {
  id: string;
  x: number; // 0-100 (% position within shape bbox)
  y: number; // 0-100
  color: string;
}

export interface MeshGradientColor {
  type: 'mesh';
  points: MeshPoint[];
}

export type ColorValue = SolidColor | GradientColor | MeshGradientColor;

export interface ColorPickerProps {
  value: ColorValue | string;
  onChange: (value: ColorValue) => void;
  label?: string;
  showRemoveButton?: boolean;
  onRemove?: () => void;
  tooltip?: string;
}
