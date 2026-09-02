export interface ColorStop {
  position: number;
  color: string;
}

export interface SolidColor {
  type: 'solid';
  color: string;
}

export interface GradientColor {
  type: 'gradient';
  angle: number;
  stops: ColorStop[];
}

export interface MeshPoint {
  id: string;
  x: number;
  y: number;
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
