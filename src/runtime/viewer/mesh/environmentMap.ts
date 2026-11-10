import { type EnvironmentImage, irradiance, mipChain } from './environment';
import { canDrawFloats, link, type Program, requireObject } from './gl';
import { PREFILTER_FRAGMENT } from './shaders/prefilter';
import { SCREEN_VERTEX } from './shaders/screen';

const UNIT = 6;

export const ENVIRONMENT_UNIFORMS = [
  'uHasEnvironment',
  'uEnvironment',
  'uEnvironmentLevels',
  'uEnvironmentStrength',
  'uEnvironmentTurn',
  'uIrradiance',
];

// Four values per pixel, as a float texture wants them.
function rgba(image: EnvironmentImage): Float32Array {
  const out = new Float32Array(image.width * image.height * 4);
  for (let i = 0; i < image.width * image.height; i++) {
    out[i * 4] = image.data[i * 3];
    out[i * 4 + 1] = image.data[i * 3 + 1];
    out[i * 4 + 2] = image.data[i * 3 + 2];
    out[i * 4 + 3] = 1;
  }
  return out;
}

function floatTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = requireObject(gl.createTexture(), 'texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

// The environment on the GPU: a picture whose smaller copies are blurred as rougher surfaces see it, and the light for matte ones.
export class EnvironmentMap {
  private readonly gl: WebGL2RenderingContext;
  private readonly quad: WebGLVertexArrayObject;
  private texture: WebGLTexture | null = null;
  private levels = 0;
  private light: Float32Array = new Float32Array(27);

  constructor(gl: WebGL2RenderingContext, quad: WebGLVertexArrayObject) {
    this.gl = gl;
    this.quad = quad;
  }

  get present(): boolean {
    return this.texture !== null;
  }

  set(image: EnvironmentImage | null): void {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    this.texture = null;
    if (!image) {
      return;
    }
    const chain = mipChain(image);
    const source = floatTexture(gl);
    chain.forEach((level, index) => {
      gl.texImage2D(gl.TEXTURE_2D, index, gl.RGBA16F, level.width, level.height, 0, gl.RGBA, gl.FLOAT, rgba(level));
    });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, chain.length - 1);
    // Without float targets the plain smaller copies stand in for the blurred ones.
    const blurred = canDrawFloats(gl) ? this.prefilter(source, chain) : null;
    if (blurred) {
      gl.deleteTexture(source);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.texture = blurred ?? source;
    this.levels = chain.length;
    this.light = irradiance(image);
  }

  // For the program of the meshes, with how far the environment is turned and how strong it is.
  bind(uniforms: Program['uniforms'], turnDegrees: number, strength: number): void {
    const gl = this.gl;
    gl.uniform1i(uniforms.uHasEnvironment, this.texture ? 1 : 0);
    gl.uniform1i(uniforms.uEnvironment, UNIT);
    gl.activeTexture(gl.TEXTURE0 + UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE0);
    if (!this.texture) {
      return;
    }
    const turn = (turnDegrees * Math.PI) / 180;
    gl.uniform1f(uniforms.uEnvironmentLevels, this.levels - 1);
    gl.uniform1f(uniforms.uEnvironmentStrength, strength);
    gl.uniform2f(uniforms.uEnvironmentTurn, Math.cos(turn), Math.sin(turn));
    gl.uniform3fv(uniforms.uIrradiance, this.light);
  }

  private prefilter(source: WebGLTexture, chain: readonly EnvironmentImage[]): WebGLTexture | null {
    const gl = this.gl;
    const target = floatTexture(gl);
    gl.texStorage2D(gl.TEXTURE_2D, chain.length, gl.RGBA16F, chain[0].width, chain[0].height);
    const { program, uniforms } = link(gl, PREFILTER_FRAGMENT, ['uSource', 'uRoughness', 'uTexel'], SCREEN_VERTEX);
    const buffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source);
    gl.uniform1i(uniforms.uSource, 0);
    gl.uniform1f(uniforms.uTexel, (4 * Math.PI) / (chain[0].width * chain[0].height));
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.quad);
    const complete = chain.every((level, index) => {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, index);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        return false;
      }
      gl.viewport(0, 0, level.width, level.height);
      gl.uniform1f(uniforms.uRoughness, index / (chain.length - 1));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    });
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(buffer);
    gl.deleteProgram(program);
    if (!complete) {
      gl.deleteTexture(target);
      return null;
    }
    return target;
  }

  destroy(): void {
    this.set(null);
  }
}
