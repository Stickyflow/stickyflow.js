import type { ShaderParameter } from '../../../model/shader';
import { shaderProgram } from './programs';
import type { Surface } from './surfaceTypes';
import { color } from './uniforms';
import { linkProgram, transparentTexture } from './webgl';

function parametersOf(owner: Element): Record<string, ShaderParameter> {
  try {
    return JSON.parse(owner.getAttribute('data-sf-shader-params') ?? '{}') as Record<string, ShaderParameter>;
  } catch {
    return {};
  }
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
  const usesBackdrop = definition.usesBackdrop === true;
  const shapeColor = color(owner.getAttribute('data-sf-shader-fill') ?? undefined, [1, 1, 1]);
  const ownerId = owner.getAttribute('data-sf-id');
  const baseGeometry =
    definition.replacesBaseFill && ownerId
      ? ([...(owner.closest('svg')?.querySelectorAll('[data-sf-primary="true"]') ?? [])].find(
          element => element !== owner && element.getAttribute('data-sf-id') === ownerId,
        ) ?? undefined)
      : undefined;
  const baseFill = baseGeometry?.getAttribute('fill');
  baseGeometry?.setAttribute('fill', 'none');
  return {
    owner,
    canvas,
    gl,
    program,
    buffer,
    parameters: parametersOf(owner),
    smoothed: new Map(),
    backdropTexture: usesBackdrop ? transparentTexture(gl) : undefined,
    backdropOrigin: [0, 0],
    backdropScale: [1, 1],
    usesBackdrop,
    shapeColor,
    baseGeometry,
    baseFill,
  };
}
