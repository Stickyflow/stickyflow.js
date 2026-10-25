import type { ShaderParameter } from '../../../model/shader';

export interface Surface {
  owner: Element;
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  parameters: Record<string, ShaderParameter>;
  surfacePadding: number;
  backdropTexture?: WebGLTexture;
  backdropOrigin: [number, number];
  backdropScale: [number, number];
  usesBackdrop: boolean;
  shapeColor: [number, number, number];
  baseGeometry?: Element;
  baseFill?: string | null;
  smoothed: Map<string, number>;
  // Where the pointer is over the surface, from 0 to 1 and counted from the lower left, and how far it is there: 1 while it is over it.
  pointer: { x: number; y: number };
  hovering: boolean;
  hover: number;
  lastSeconds?: number;
  reactiveLight?: {
    x: number;
    y: number;
    strength: number;
    radius: number;
    color: [number, number, number];
  };
}
