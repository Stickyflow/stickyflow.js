export interface SflPathData {
  points: Array<{ x: number; y: number; tension?: number }>;
  tension?: number;
  startMarker?: string;
  endMarker?: string;
  closed?: boolean;
  value?: number;
}
