import { type Box, boxCorner, type Camera } from './camera';
import { type Drawable, link, type Program } from './gl';
import { transformPoint } from './matrix';
import { PROBE_FRAGMENT } from './shaders/probe';

// A part that may lie under the pointer, with the box of its shape before it is placed.
export interface ProbeTarget extends Drawable {
  id: string;
  bounds: Box;
}

// Whether the box of a part, as the canvas sees it, can cover a point of the canvas.
function mayCover({ bounds, world }: ProbeTarget, camera: Camera, x: number, y: number): boolean {
  const m = camera.viewProjection;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let index = 0; index < 8; index++) {
    const [px, py, pz] = transformPoint(world, boxCorner(bounds, index));
    const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
    if (w <= 0) {
      return true;
    }
    const sx = (m[0] * px + m[4] * py + m[8] * pz + m[12]) / w;
    const sy = (m[1] * px + m[5] * py + m[9] * pz + m[13]) / w;
    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

// Finds what lies under a point of the canvas by drawing only that one pixel, with an id and a distance for its color.
export class MeshProbe {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: Program;
  private buffer: WebGLFramebuffer | null = null;
  private color: WebGLTexture | null = null;
  private depth: WebGLRenderbuffer | null = null;
  private size = '';

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = link(gl, PROBE_FRAGMENT, [
      'uModel',
      'uViewProjection',
      'uNormal',
      'uLight',
      'uEye',
      'uRange',
      'uId',
    ]);
  }

  find(targets: readonly ProbeTarget[], camera: Camera, x: number, y: number): { id: string; distance: number } | null {
    const candidates = targets.filter(target => mayCover(target, camera, x, y));
    if (candidates.length === 0) {
      return null;
    }
    const gl = this.gl;
    this.prepare();
    const px = Math.max(0, Math.min(gl.drawingBufferWidth - 1, Math.floor(((x + 1) / 2) * gl.drawingBufferWidth)));
    const py = Math.max(0, Math.min(gl.drawingBufferHeight - 1, Math.floor(((y + 1) / 2) * gl.drawingBufferHeight)));
    const { program, uniforms } = this.program;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(px, py, 1, 1);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    gl.uniform1f(uniforms.uRange, camera.range);
    candidates.forEach((target, index) => {
      const id = index + 1;
      gl.uniform2f(uniforms.uId, (id >> 8) / 255, (id & 255) / 255);
      gl.uniformMatrix4fv(uniforms.uModel, false, target.world);
      target.draw();
    });
    const pixel = new Uint8Array(4);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const found = candidates[((pixel[0] << 8) | pixel[1]) - 1];
    return found ? { id: found.id, distance: (((pixel[2] << 8) | pixel[3]) / 65535) * camera.range } : null;
  }

  private prepare(): void {
    const gl = this.gl;
    const size = `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
    if (size === this.size && this.buffer) {
      return;
    }
    this.release();
    this.size = size;
    this.buffer = gl.createFramebuffer();
    this.color = gl.createTexture();
    this.depth = gl.createRenderbuffer();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.color);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.color, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private release(): void {
    const gl = this.gl;
    gl.deleteFramebuffer(this.buffer);
    gl.deleteTexture(this.color);
    gl.deleteRenderbuffer(this.depth);
    this.buffer = null;
  }

  destroy(): void {
    this.release();
    this.gl.deleteProgram(this.program.program);
  }
}
