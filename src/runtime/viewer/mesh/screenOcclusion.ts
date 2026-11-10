import type { Camera } from './camera';
import { canDrawFloats, type Drawable, link, type Program, requireObject } from './gl';
import { identity, invert, type Mat4, normalMatrix } from './matrix';
import { GEOMETRY_FRAGMENT, OCCLUSION_BLUR_FRAGMENT, OCCLUSION_FRAGMENT } from './shaders/occlusion';
import { SCREEN_VERTEX } from './shaders/screen';

const UNIT = 7;

export const SCREEN_OCCLUSION_UNIFORMS = ['uHasScreenOcclusion', 'uScreenOcclusion', 'uScreen'];

// Directions in the half sphere over a surface, more of them close to it, the same every time.
const KERNEL = new Float32Array(
  Array.from({ length: 16 }, (_, i) => {
    const u = ((i * 0.618034) % 1) * 2 * Math.PI;
    const v = ((i + 0.5) / 16) ** 0.8;
    const length = 0.12 + 0.88 * ((i + 1) / 16) ** 2;
    const lift = Math.sqrt(1 - v * v);
    return [Math.cos(u) * v * length, Math.sin(u) * v * length, Math.max(0.15, lift) * length];
  }).flat(),
);

// Pictures the size of half the canvas: the faces and distances of what is seen, and how much of the sky each pixel gets.
interface Targets {
  width: number;
  height: number;
  geometry: WebGLTexture;
  depth: WebGLRenderbuffer;
  raw: WebGLTexture;
  blurred: WebGLTexture;
  buffers: WebGLFramebuffer[];
}

interface Programs {
  geometry: Program;
  occlusion: Program;
  blur: Program;
}

// How much of the sky each pixel sees, worked out from what the camera sees before the meshes are lit.
export class ScreenOcclusion {
  private readonly gl: WebGL2RenderingContext;
  private readonly screen: WebGLVertexArrayObject;
  private readonly ground: WebGLVertexArrayObject | null;
  private targets: Targets | null = null;
  // Made the first time they are needed. False when this GPU cannot draw into float pictures.
  private programs: Programs | false | null = null;

  constructor(gl: WebGL2RenderingContext, screen: WebGLVertexArrayObject, ground: WebGLVertexArrayObject | null) {
    this.gl = gl;
    this.screen = screen;
    this.ground = ground;
  }

  // Draws the occlusion for the solid things and the ground. False when it cannot be had, and then nothing is darker.
  draw(camera: Camera, solids: readonly Drawable[], radius: number, ground: Mat4 | null): boolean {
    const { gl } = this;
    const programs = this.ready();
    const width = Math.max(1, gl.drawingBufferWidth >> 1);
    const height = Math.max(1, gl.drawingBufferHeight >> 1);
    const targets = programs && this.sized(width, height);
    if (!programs || !targets) {
      return false;
    }
    const [geometryBuffer, rawBuffer, blurredBuffer] = targets.buffers;

    gl.bindFramebuffer(gl.FRAMEBUFFER, geometryBuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const { geometry } = programs;
    gl.useProgram(geometry.program);
    gl.uniformMatrix4fv(geometry.uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(geometry.uniforms.uLight, false, identity());
    gl.uniform3fv(geometry.uniforms.uEye, camera.eye);
    gl.uniform4f(geometry.uniforms.uFlat, 0, 0, 0, 0);
    for (const solid of solids) {
      gl.uniformMatrix4fv(geometry.uniforms.uModel, false, solid.world);
      gl.uniformMatrix3fv(geometry.uniforms.uNormal, false, normalMatrix(solid.world));
      solid.draw();
    }
    if (ground && this.ground) {
      gl.uniformMatrix4fv(geometry.uniforms.uModel, false, ground);
      gl.uniformMatrix3fv(geometry.uniforms.uNormal, false, normalMatrix(identity()));
      gl.uniform4f(geometry.uniforms.uFlat, 0, 1, 0, 1);
      gl.bindVertexArray(this.ground);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.screen);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, targets.geometry);
    gl.bindFramebuffer(gl.FRAMEBUFFER, rawBuffer);
    const { occlusion } = programs;
    gl.useProgram(occlusion.program);
    gl.uniform1i(occlusion.uniforms.uGeometry, 0);
    gl.uniformMatrix4fv(occlusion.uniforms.uInverse, false, invert(camera.viewProjection));
    gl.uniformMatrix4fv(occlusion.uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniform3fv(occlusion.uniforms.uEye, camera.eye);
    gl.uniform1f(occlusion.uniforms.uRadius, radius);
    gl.uniform3fv(occlusion.uniforms.uKernel, KERNEL);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, blurredBuffer);
    const { blur } = programs;
    gl.useProgram(blur.program);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, targets.geometry);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, targets.raw);
    gl.uniform1i(blur.uniforms.uRaw, 0);
    gl.uniform1i(blur.uniforms.uGeometry, 1);
    gl.uniform2f(blur.uniforms.uTexel, 1 / width, 1 / height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.DEPTH_TEST);
    return true;
  }

  // Tells a program whether there is a picture of the occlusion to read, and where it is.
  bind(uniforms: Program['uniforms'], on: boolean): void {
    const { gl } = this;
    const texture = on ? (this.targets?.blurred ?? null) : null;
    gl.uniform1i(uniforms.uHasScreenOcclusion, texture ? 1 : 0);
    gl.uniform1i(uniforms.uScreenOcclusion, UNIT);
    gl.uniform2f(uniforms.uScreen, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0 + UNIT);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE0);
  }

  private ready(): Programs | false {
    const { gl } = this;
    if (this.programs === null) {
      this.programs = canDrawFloats(gl) && {
        geometry: link(gl, GEOMETRY_FRAGMENT, ['uModel', 'uViewProjection', 'uNormal', 'uLight', 'uEye', 'uFlat']),
        occlusion: link(
          gl,
          OCCLUSION_FRAGMENT,
          ['uGeometry', 'uInverse', 'uViewProjection', 'uEye', 'uRadius', 'uKernel'],
          SCREEN_VERTEX,
        ),
        blur: link(gl, OCCLUSION_BLUR_FRAGMENT, ['uRaw', 'uGeometry', 'uTexel'], SCREEN_VERTEX),
      };
    }
    return this.programs;
  }

  private sized(width: number, height: number): Targets | null {
    const { gl } = this;
    if (this.targets && this.targets.width === width && this.targets.height === height) {
      return this.targets;
    }
    this.release();
    const picture = (format: number, filter: number) => {
      const texture = requireObject(gl.createTexture(), 'texture');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    const geometry = picture(gl.RGBA16F, gl.NEAREST);
    const raw = picture(gl.R8, gl.LINEAR);
    const blurred = picture(gl.R8, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    const depth = requireObject(gl.createRenderbuffer(), 'renderbuffer');
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    const buffers = [geometry, raw, blurred].map((texture, index) => {
      const buffer = requireObject(gl.createFramebuffer(), 'framebuffer');
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (index === 0) {
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      }
      return buffer;
    });
    const complete = buffers.every(buffer => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.targets = { width, height, geometry, depth, raw, blurred, buffers };
    if (!complete) {
      this.release();
      this.programs = false;
    }
    return this.targets;
  }

  private release(): void {
    const { gl } = this;
    const { targets } = this;
    if (!targets) {
      return;
    }
    for (const texture of [targets.geometry, targets.raw, targets.blurred]) {
      gl.deleteTexture(texture);
    }
    gl.deleteRenderbuffer(targets.depth);
    for (const buffer of targets.buffers) {
      gl.deleteFramebuffer(buffer);
    }
    this.targets = null;
  }

  destroy(): void {
    this.release();
    if (this.programs) {
      for (const { program } of Object.values(this.programs)) {
        this.gl.deleteProgram(program);
      }
    }
    this.programs = null;
  }
}
