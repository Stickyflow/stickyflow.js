import type { ShaderBackdrop } from './backdrop';
import { SHADER_DEFAULTS } from './defaults';
import type { Surface } from './surfaceTypes';
import { applyParameters, color, number, uniform1f, uniform2f, uniform3f, uniformName } from './uniforms';

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

export function applyBackdrop(surface: Surface, backdrop: ShaderBackdrop): void {
  if (!surface.backdropTexture) {
    return;
  }
  syncBackdropBounds(surface);
  const { gl } = surface;
  gl.bindTexture(gl.TEXTURE_2D, surface.backdropTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdrop.image);
}

const MAX_SURFACE_PIXELS = 2560;
const TRAIL_LENGTH = 16;

export function renderSurface(surface: Surface, seconds: number): void {
  const { canvas, gl, parameters } = surface;
  const shown = canvas.getBoundingClientRect();
  const density = Math.min(globalThis.devicePixelRatio || 1, 3);
  const fit = Math.min(1, MAX_SURFACE_PIXELS / Math.max(1, shown.width * density, shown.height * density));
  const width = Math.max(1, Math.round((shown.width || canvas.clientWidth) * density * fit));
  const height = Math.max(1, Math.round((shown.height || canvas.clientHeight) * density * fit));
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
  const logicalWidth = Number(surface.owner.getAttribute('width'));
  uniform1f(
    surface,
    'uPixelScale',
    Number.isFinite(logicalWidth) && logicalWidth > 0 ? width / logicalWidth : density * fit,
  );
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
  for (const [key, fallback] of Object.entries(SHADER_DEFAULTS.numbers)) {
    uniform1f(surface, uniformName(key), number(parameters[key], fallback));
  }
  for (const [key, fallback] of Object.entries(SHADER_DEFAULTS.colors)) {
    uniform3f(surface, uniformName(key), color(parameters[key], [...fallback] as [number, number, number]));
  }
  uniform3f(surface, 'uShapeColor', surface.shapeColor);
  const elapsed = surface.lastSeconds === undefined ? 0 : Math.max(0, Math.min(seconds - surface.lastSeconds, 0.1));
  surface.lastSeconds = seconds;
  applyParameters(surface, elapsed);
  surface.hover += ((surface.hovering ? 1 : 0) - surface.hover) * (1 - Math.exp(-elapsed / 0.18));
  uniform2f(surface, 'uPointer', [surface.pointer.x, surface.pointer.y]);
  uniform1f(surface, 'uHover', surface.hover);
  // The trail: where the pointer has been, and how much of it is left. `trail` is how many seconds a place takes to fade out.
  const fade = number(parameters.trail, 0);
  const places = new Float32Array(TRAIL_LENGTH * 3);
  if (fade > 0) {
    surface.trail.slice(-TRAIL_LENGTH).forEach((place, index) => {
      places.set([place.x, place.y, Math.exp(-Math.max(seconds - place.at, 0) / fade)], index * 3);
    });
  }
  const trail = gl.getUniformLocation(surface.program, 'uWake[0]');
  if (trail) {
    gl.uniform3fv(trail, places);
  }
  if (surface.reactiveLight) {
    uniform1f(surface, 'uLightX', surface.reactiveLight.x);
    uniform1f(surface, 'uLightY', surface.reactiveLight.y);
    uniform1f(surface, 'uLightStrength', surface.reactiveLight.strength);
    uniform1f(surface, 'uGlowRadius', surface.reactiveLight.radius);
    uniform3f(surface, 'uLightColor', surface.reactiveLight.color);
  }
  uniform1f(surface, 'uSurfacePadding', surface.surfacePadding);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
