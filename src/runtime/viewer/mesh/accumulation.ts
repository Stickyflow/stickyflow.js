import { canDrawFloats, link, type Program, requireObject } from './gl';
import { ADD_FRAGMENT, SHOW_FRAGMENT } from './shaders/accumulate';
import { SCREEN_VERTEX } from './shaders/screen';

// A sequence of numbers from 0 to 1 that fills the range evenly, one for each index and base.
export function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;
  for (let rest = index; rest > 0; rest = Math.floor(rest / base)) {
    result += fraction * (rest % base);
    fraction /= base;
  }
  return result;
}

interface Targets {
  width: number;
  height: number;
  frame: WebGLTexture;
  depth: WebGLRenderbuffer;
  sum: WebGLTexture;
  frameBuffer: WebGLFramebuffer;
  sumBuffer: WebGLFramebuffer;
}

// A still picture made of many frames: each is drawn into a picture of its own, added to a sum, and the mean of the sum is shown.
export class Accumulation {
  private readonly gl: WebGL2RenderingContext;
  private readonly quad: WebGLVertexArrayObject;
  private programs: { add: Program; show: Program } | false | null = null;
  private targets: Targets | null = null;
  private frames = 0;

  constructor(gl: WebGL2RenderingContext, quad: WebGLVertexArrayObject) {
    this.gl = gl;
    this.quad = quad;
  }

  get count(): number {
    return this.frames;
  }

  // Whether this GPU can keep a sum of frames.
  get possible(): boolean {
    if (this.programs === null) {
      const gl = this.gl;
      this.programs = canDrawFloats(gl) && {
        add: link(gl, ADD_FRAGMENT, ['uFrame'], SCREEN_VERTEX),
        show: link(gl, SHOW_FRAGMENT, ['uSum', 'uCount'], SCREEN_VERTEX),
      };
    }
    return this.programs !== false;
  }

  reset(): void {
    this.frames = 0;
  }

  // The target for the next frame, cleared, the size of the canvas. Null when there is none to be had.
  begin(): WebGLFramebuffer | null {
    const gl = this.gl;
    const targets = this.possible ? this.sized(gl.drawingBufferWidth, gl.drawingBufferHeight) : null;
    if (!targets) {
      return null;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.frameBuffer);
    gl.viewport(0, 0, targets.width, targets.height);
    gl.clearColor(0, 0, 0, 0);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    return targets.frameBuffer;
  }

  // Adds the frame that was drawn to the sum, and shows the mean on the canvas when asked to.
  add(show: boolean): void {
    const { gl, targets, programs } = this;
    if (!targets || !programs) {
      return;
    }
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.quad);
    gl.activeTexture(gl.TEXTURE0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.sumBuffer);
    gl.viewport(0, 0, targets.width, targets.height);
    if (this.frames === 0) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(programs.add.program);
    gl.bindTexture(gl.TEXTURE_2D, targets.frame);
    gl.uniform1i(programs.add.uniforms.uFrame, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
    this.frames++;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!show) {
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindVertexArray(null);
      gl.enable(gl.DEPTH_TEST);
      return;
    }
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programs.show.program);
    gl.bindTexture(gl.TEXTURE_2D, targets.sum);
    gl.uniform1i(programs.show.uniforms.uSum, 0);
    gl.uniform1f(programs.show.uniforms.uCount, this.frames);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.enable(gl.DEPTH_TEST);
  }

  private sized(width: number, height: number): Targets | null {
    const gl = this.gl;
    if (this.targets && this.targets.width === width && this.targets.height === height) {
      return this.targets;
    }
    this.release();
    const picture = (format: number) => {
      const texture = requireObject(gl.createTexture(), 'texture');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    // Frames hold light, not what a screen shows, so they add up as light does.
    const frame = picture(gl.RGBA16F);
    const sum = picture(gl.RGBA16F);
    gl.bindTexture(gl.TEXTURE_2D, null);
    const depth = requireObject(gl.createRenderbuffer(), 'renderbuffer');
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    const frameBuffer = requireObject(gl.createFramebuffer(), 'framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frame, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    const frameComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    const sumBuffer = requireObject(gl.createFramebuffer(), 'framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, sumBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sum, 0);
    const sumComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.targets = { width, height, frame, depth, sum, frameBuffer, sumBuffer };
    this.frames = 0;
    if (!frameComplete || !sumComplete) {
      this.release();
      this.programs = false;
    }
    return this.targets;
  }

  private release(): void {
    const { gl, targets } = this;
    if (!targets) {
      return;
    }
    gl.deleteTexture(targets.frame);
    gl.deleteTexture(targets.sum);
    gl.deleteRenderbuffer(targets.depth);
    gl.deleteFramebuffer(targets.frameBuffer);
    gl.deleteFramebuffer(targets.sumBuffer);
    this.targets = null;
  }

  destroy(): void {
    this.release();
    if (this.programs) {
      this.gl.deleteProgram(this.programs.add.program);
      this.gl.deleteProgram(this.programs.show.program);
    }
    this.programs = null;
  }
}
