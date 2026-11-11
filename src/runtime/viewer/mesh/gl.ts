import type { Mat4 } from './matrix';
import { VERTEX } from './shaders/mesh';

export interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

// Something the renderer can draw at its place in the world, for passes that only need its shape.
export interface Drawable {
  world: Mat4;
  draw(): void;
}

// Two triangles over a square from -1 to 1.
export const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

export function requireObject<T>(value: T | null, what: string): T {
  if (value === null) {
    throw new Error(`WebGL2 could not make a ${what}`);
  }
  return value;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = requireObject(gl.createShader(type), 'shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WebGL2 shader: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  beforeLink?: (program: WebGLProgram) => void,
): WebGLProgram {
  const program = requireObject(gl.createProgram(), 'program');
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  beforeLink?.(program);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL2 program: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

export function link(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
  names: readonly string[],
  vertexSource = VERTEX,
): Program {
  const program = linkProgram(gl, vertexSource, fragmentSource);
  return { program, uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) };
}

// Whether this GPU can draw into pictures of float numbers, which the environment and the occlusion need.
export function canDrawFloats(gl: WebGL2RenderingContext): boolean {
  return Boolean(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
}
