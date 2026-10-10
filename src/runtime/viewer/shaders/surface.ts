import type { ShaderParameter } from '../../../model/shader';
import { shaderProgram } from './programs';

const VERTEX_SOURCE = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

interface Surface {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  parameters: Record<string, ShaderParameter>;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | undefined {
  const shader = gl.createShader(type);
  if (!shader) {
    return undefined;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return undefined;
  }
  return shader;
}

function linkProgram(gl: WebGLRenderingContext, fragmentSource: string): WebGLProgram | undefined {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    if (vertex) {
      gl.deleteShader(vertex);
    }
    if (fragment) {
      gl.deleteShader(fragment);
    }
    return undefined;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return undefined;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return undefined;
  }
  return program;
}

function parametersOf(owner: Element): Record<string, ShaderParameter> {
  try {
    return JSON.parse(owner.getAttribute('data-sf-shader-params') ?? '{}') as Record<string, ShaderParameter>;
  } catch {
    return {};
  }
}

function createSurface(canvas: HTMLCanvasElement): Surface | undefined {
  const owner = canvas.closest('[data-sf-shader]');
  const name = owner?.getAttribute('data-sf-shader');
  const definition = name ? shaderProgram(name) : undefined;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!owner || !definition || !gl) {
    return undefined;
  }
  const program = linkProgram(gl, definition.fragmentSource);
  if (!program) {
    return undefined;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return undefined;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  if (position < 0) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return undefined;
  }
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { canvas, gl, program, buffer, parameters: parametersOf(owner) };
}

function color(value: ShaderParameter | undefined, fallback: [number, number, number]): [number, number, number] {
  if (typeof value !== 'string') {
    return fallback;
  }
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) {
    return fallback;
  }
  const integer = Number.parseInt(match[1], 16);
  return [((integer >> 16) & 255) / 255, ((integer >> 8) & 255) / 255, (integer & 255) / 255];
}

function number(value: ShaderParameter | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function uniform1f(surface: Surface, name: string, value: number): void {
  const location = surface.gl.getUniformLocation(surface.program, name);
  if (location) {
    surface.gl.uniform1f(location, value);
  }
}

function uniform3f(surface: Surface, name: string, value: [number, number, number]): void {
  const location = surface.gl.getUniformLocation(surface.program, name);
  if (location) {
    surface.gl.uniform3f(location, ...value);
  }
}

function uniformName(parameter: string): string {
  return `u${parameter.charAt(0).toUpperCase()}${parameter.slice(1)}`;
}

function applyParameters(surface: Surface): void {
  for (const [key, value] of Object.entries(surface.parameters)) {
    const name = uniformName(key);
    if (typeof value === 'number') {
      uniform1f(surface, name, value);
      continue;
    }
    if (typeof value === 'boolean') {
      const location = surface.gl.getUniformLocation(surface.program, name);
      if (location) {
        surface.gl.uniform1i(location, value ? 1 : 0);
      }
      continue;
    }
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      uniform3f(surface, name, color(value, [0, 0, 0]));
    }
  }
}

function renderSurface(surface: Surface, seconds: number): void {
  const { canvas, gl, parameters } = surface;
  const width = Math.max(1, Math.round(canvas.clientWidth * (globalThis.devicePixelRatio || 1)));
  const height = Math.max(1, Math.round(canvas.clientHeight * (globalThis.devicePixelRatio || 1)));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(surface.program);
  const resolution = gl.getUniformLocation(surface.program, 'uResolution');
  if (resolution) {
    gl.uniform2f(resolution, width, height);
  }
  uniform1f(surface, 'uTime', seconds);
  uniform1f(surface, 'uIntensity', number(parameters.intensity, 0.85));
  uniform1f(surface, 'uSpeed', number(parameters.speed, 0.18));
  uniform3f(surface, 'uColor', color(parameters.color, [0.08, 0.02, 0.22]));
  uniform3f(surface, 'uAccent', color(parameters.accent, [0.58, 0.31, 1]));
  applyParameters(surface);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export interface ShaderSurfaceHandle {
  refresh(): void;
  destroy(): void;
}

export function mountShaderSurfaces(svg: SVGSVGElement): ShaderSurfaceHandle {
  let surfaces: Surface[] = [];
  let frame: number | undefined;
  const view = svg.ownerDocument.defaultView;

  const draw = (milliseconds: number) => {
    for (const surface of surfaces) {
      renderSurface(surface, milliseconds / 1000);
    }
    frame = view?.requestAnimationFrame(draw);
  };

  const stop = () => {
    if (frame !== undefined) {
      view?.cancelAnimationFrame(frame);
      frame = undefined;
    }
    for (const surface of surfaces) {
      surface.gl.deleteBuffer(surface.buffer);
      surface.gl.deleteProgram(surface.program);
    }
    surfaces = [];
  };

  const refresh = () => {
    stop();
    surfaces = [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].flatMap(canvas => {
      const surface = createSurface(canvas);
      return surface ? [surface] : [];
    });
    if (surfaces.length > 0) {
      if (view?.requestAnimationFrame) {
        frame = view.requestAnimationFrame(draw);
      } else {
        for (const surface of surfaces) {
          renderSurface(surface, 0);
        }
      }
    }
  };

  refresh();
  return { refresh, destroy: stop };
}
