export interface ShadowStyle {
  enabled: boolean;
  color?: string;
  opacity?: number;
  blur?: number;
  angle?: number;
  distance?: number;
}

export interface ResolvedShadow {
  color: string;
  opacity: number;
  blur: number;
  dx: number;
  dy: number;
}
