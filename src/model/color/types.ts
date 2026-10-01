export interface ColorStop {
  position: number;
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
