import type { ShaderParameter } from '../../../model/shader';

export interface Surface {
  owner: Element;
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  parameters: Record<string, ShaderParameter>;
  backdropTexture?: WebGLTexture;
  backdropOrigin: [number, number];
  backdropScale: [number, number];
  usesBackdrop: boolean;
  shapeColor: [number, number, number];
  baseGeometry?: Element;
  baseFill?: string | null;
  smoothed: Map<string, number>;
  lastSeconds?: number;
}
