export interface GradientColorObject {
  type: 'gradient';
  angle: number;
  stops: Array<{ position: number; color: string }>;
}

export interface MeshGradientObject {
  type: 'mesh';
  points: Array<{ id: string; x: number; y: number; color: string }>;
}
