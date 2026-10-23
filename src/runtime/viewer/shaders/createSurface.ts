import type { ShaderParameter } from '../../../model/shader';
import { shaderProgram } from './programs';
import type { Surface } from './surfaceTypes';
import type { ShaderProgram } from './types';
import { color } from './uniforms';
import { linkProgram, transparentTexture } from './webgl';

const FULL_SCREEN_QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

function parametersOf(owner: Element): Record<string, ShaderParameter> {
  try {
    return JSON.parse(owner.getAttribute('data-sf-shader-params') ?? '{}') as Record<string, ShaderParameter>;
  } catch {
    return {};
  }
}

function surfacePaddingOf(owner: Element): number {
  const padding = Number(owner.getAttribute('data-sf-shader-padding'));
  return Number.isFinite(padding) ? Math.max(0, padding) : 0;
}

function bindFullScreenQuad(gl: WebGLRenderingContext, program: WebGLProgram): WebGLBuffer | undefined {
  const buffer = gl.createBuffer();
  if (!buffer) {
    return undefined;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, FULL_SCREEN_QUAD, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  if (position < 0) {
    gl.deleteBuffer(buffer);
    return undefined;
  }
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

function findBaseGeometry(owner: Element, definition: ShaderProgram): Element | undefined {
  const ownerId = owner.getAttribute('data-sf-id');
  if (!definition.replacesBaseFill || !ownerId) {
    return undefined;
  }
  const candidates = [...(owner.closest('svg')?.querySelectorAll('[data-sf-primary="true"]') ?? [])];
  return candidates.find(element => element !== owner && element.getAttribute('data-sf-id') === ownerId);
}

export function createSurface(canvas: HTMLCanvasElement): Surface | undefined {
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
  const buffer = bindFullScreenQuad(gl, program);
  if (!buffer) {
    gl.deleteProgram(program);
    return undefined;
  }
  const usesBackdrop = definition.usesBackdrop === true;
  const baseGeometry = findBaseGeometry(owner, definition);
  const baseFill = baseGeometry?.getAttribute('fill');
  baseGeometry?.setAttribute('fill', 'none');
  return {
    owner,
    canvas,
    gl,
    program,
    buffer,
    parameters: { ...definition.defaultParameters, ...parametersOf(owner) },
    surfacePadding: surfacePaddingOf(owner),
    smoothed: new Map(),
    backdropTexture: usesBackdrop ? transparentTexture(gl) : undefined,
    backdropOrigin: [0, 0],
    backdropScale: [1, 1],
    usesBackdrop,
    shapeColor: color(owner.getAttribute('data-sf-shader-fill') ?? undefined, [1, 1, 1]),
    baseGeometry,
    baseFill,
  };
}

export function releaseSurface(surface: Surface): void {
  if (surface.backdropTexture) {
    surface.gl.deleteTexture(surface.backdropTexture);
  }
  surface.gl.deleteBuffer(surface.buffer);
  surface.gl.deleteProgram(surface.program);
  if (!surface.baseGeometry) {
    return;
  }
  if (surface.baseFill === null || surface.baseFill === undefined) {
    surface.baseGeometry.removeAttribute('fill');
  } else {
    surface.baseGeometry.setAttribute('fill', surface.baseFill);
  }
}
