import type { ShaderParameter } from '../../../model/shader';
import { captureShaderBackdrop, type ShaderBackdrop } from './backdrop';
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

function transparentTexture(gl: WebGLRenderingContext): WebGLTexture | undefined {
  const texture = gl.createTexture();
  if (!texture) {
    return undefined;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  return texture;
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
    backdropTexture: usesBackdrop ? transparentTexture(gl) : undefined,
    backdropOrigin: [0, 0],
    backdropScale: [1, 1],
    usesBackdrop,
    shapeColor,
    baseGeometry,
    baseFill,
  };
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

function uniform2f(surface: Surface, name: string, value: [number, number]): void {
  const location = surface.gl.getUniformLocation(surface.program, name);
  if (location) {
    surface.gl.uniform2f(location, ...value);
  }
}

function syncBackdropBounds(surface: Surface): void {
  const svg = surface.canvas.closest('svg');
  if (!svg) {
    return;
  }
  const svgBounds = svg.getBoundingClientRect();
  const surfaceBounds = surface.canvas.getBoundingClientRect();
  if (svgBounds.width <= 0 || svgBounds.height <= 0) {
    return;
  }
  surface.backdropOrigin = [
    (surfaceBounds.left - svgBounds.left) / svgBounds.width,
    (svgBounds.bottom - surfaceBounds.bottom) / svgBounds.height,
  ];
  surface.backdropScale = [surfaceBounds.width / svgBounds.width, surfaceBounds.height / svgBounds.height];
}

function applyBackdrop(surface: Surface, backdrop: ShaderBackdrop): void {
  if (!surface.backdropTexture) {
    return;
  }
  syncBackdropBounds(surface);
  const { gl } = surface;
  gl.bindTexture(gl.TEXTURE_2D, surface.backdropTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdrop.image);
}

function uniformName(parameter: string): string {
  return `u${parameter.charAt(0).toUpperCase()}${parameter.slice(1)}`;
}

function enumParameter(name: string, value: string): number | undefined {
  const values: Record<string, Record<string, number>> = {
    direction: { left: 0, right: 1, top: 2, bottom: 3 },
    orientation: { vertical: 0, horizontal: 1 },
  };
  return values[name]?.[value];
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
    const enumValue = enumParameter(key, value);
    if (enumValue !== undefined) {
      uniform1f(surface, name, enumValue);
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
  if (surface.backdropTexture) {
    syncBackdropBounds(surface);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, surface.backdropTexture);
    const sampler = gl.getUniformLocation(surface.program, 'uBackdrop');
    if (sampler) {
      gl.uniform1i(sampler, 0);
    }
    uniform2f(surface, 'uBackdropOrigin', surface.backdropOrigin);
    uniform2f(surface, 'uBackdropScale', surface.backdropScale);
  }
  uniform1f(surface, 'uIntensity', number(parameters.intensity, 0.85));
  uniform1f(surface, 'uSpeed', number(parameters.speed, 0.18));
  uniform1f(surface, 'uProgress', number(parameters.progress, -1));
  uniform1f(surface, 'uBoost', number(parameters.boost, 0));
  uniform3f(surface, 'uColor', color(parameters.color, [0.08, 0.02, 0.22]));
  uniform3f(surface, 'uAccent', color(parameters.accent, [0.58, 0.31, 1]));
  uniform3f(surface, 'uShapeColor', surface.shapeColor);
  applyParameters(surface);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export interface ShaderSurfaceHandle {
  capture(): Array<string | undefined>;
  setParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean;
  refresh(): void;
  destroy(): void;
}

export function mountShaderSurfaces(svg: SVGSVGElement): ShaderSurfaceHandle {
  let surfaces: Surface[] = [];
  let frame: number | undefined;
  let backdropGeneration = 0;
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
      if (surface.backdropTexture) {
        surface.gl.deleteTexture(surface.backdropTexture);
      }
      surface.gl.deleteBuffer(surface.buffer);
      surface.gl.deleteProgram(surface.program);
      if (surface.baseGeometry) {
        if (surface.baseFill === null || surface.baseFill === undefined) {
          surface.baseGeometry.removeAttribute('fill');
        } else {
          surface.baseGeometry.setAttribute('fill', surface.baseFill);
        }
      }
    }
    surfaces = [];
  };

  const captureBackdrops = (generation: number) => {
    for (const surface of surfaces) {
      if (!surface.usesBackdrop) {
        continue;
      }
      void captureShaderBackdrop(svg, surface.owner).then(backdrop => {
        if (backdrop && generation === backdropGeneration) {
          applyBackdrop(surface, backdrop);
        }
      });
    }
  };

  const refresh = () => {
    stop();
    const generation = ++backdropGeneration;
    surfaces = [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].flatMap(canvas => {
      const surface = createSurface(canvas);
      return surface ? [surface] : [];
    });
    captureBackdrops(generation);
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

  const capture = (): Array<string | undefined> => {
    const seconds = (view?.performance.now() ?? 0) / 1000;
    const surfaceByCanvas = new Map(surfaces.map(surface => [surface.canvas, surface]));
    return [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].map(canvas => {
      const surface = surfaceByCanvas.get(canvas);
      if (!surface) {
        return undefined;
      }
      try {
        renderSurface(surface, seconds);
        return surface.canvas.toDataURL('image/png');
      } catch {
        return undefined;
      }
    });
  };

  const setParameters = (ownerId: string, parameters: Record<string, ShaderParameter>): boolean => {
    let changed = false;
    const seconds = (view?.performance.now() ?? 0) / 1000;
    for (const surface of surfaces) {
      if (surface.owner.getAttribute('data-sf-id') !== ownerId) {
        continue;
      }
      Object.assign(surface.parameters, parameters);
      surface.owner.setAttribute('data-sf-shader-params', JSON.stringify(surface.parameters));
      renderSurface(surface, seconds);
      changed = true;
    }
    return changed;
  };

  let recapture: number | undefined;
  const scheduleRecapture = () => {
    if (recapture !== undefined) {
      view?.clearTimeout(recapture);
    }
    recapture = view?.setTimeout(() => {
      recapture = undefined;
      captureBackdrops(backdropGeneration);
    }, 120);
  };
  const viewObserver = view ? new view.MutationObserver(scheduleRecapture) : undefined;
  viewObserver?.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  const sizeObserver = view?.ResizeObserver ? new view.ResizeObserver(scheduleRecapture) : undefined;
  sizeObserver?.observe(svg);

  refresh();
  const destroy = () => {
    backdropGeneration += 1;
    viewObserver?.disconnect();
    sizeObserver?.disconnect();
    if (recapture !== undefined) {
      view?.clearTimeout(recapture);
    }
    stop();
  };

  return { capture, setParameters, refresh, destroy };
}
