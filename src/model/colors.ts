
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

export type PatternStyle = 'hachure' | 'cross-hatch' | 'dots';

// Angle restricted to 0/45/90/135 - the only line directions a small
// repeating tile can render as seamless parallel stripes on both the SVG
// export and (main app) Konva canvas, see patternFill.ts.
export interface PatternColor {
  type: 'pattern';
  pattern: PatternStyle;
  color: string;
  spacing: number;
  strokeWidth: number;
  angle: 0 | 45 | 90 | 135;
}

export type ColorValue = SolidColor | GradientColor | MeshGradientColor | PatternColor;

export interface ColorPickerProps {
  value: ColorValue | string;
  onChange: (value: ColorValue) => void;
  label?: string;
  showRemoveButton?: boolean;
  onRemove?: () => void;
  tooltip?: string;
}
