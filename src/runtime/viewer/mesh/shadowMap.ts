import type { Vec3 } from '../../../model/mesh';
import { type Box, boxCenter, boxDiagonal } from './camera';
import { type Drawable, link, type Program } from './gl';
import { lookAt, type Mat4, multiply, orthographic } from './matrix';
import { DEPTH_FRAGMENT } from './shaders/mesh';

const SIZE = 2048;
const UNIT = 1;
const WORLD_UP: Vec3 = [0, 1, 0];

// Something that casts a shadow, with what tells whether it has changed since the map was drawn.
export interface Caster extends Drawable {
  key: string;
}

// The scene seen from the sun, as a picture of how far away everything is. It is drawn again only when something that casts a
// shadow has moved, or the sun has.
export class ShadowMap {
  private readonly gl: WebGL2RenderingContext;
  private readonly depth: Program;
  private readonly texture: WebGLTexture | null;
  private readonly buffer: WebGLFramebuffer | null;
  private key = '';
  private matrix: Mat4 | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.depth = link(gl, DEPTH_FRAGMENT, ['uModel', 'uViewProjection', 'uNormal', 'uLight']);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SIZE, SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.buffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // The matrix from the world to the map, after drawing the map if anything has changed.
  update(casters: readonly Caster[], box: Box, direction: Vec3): Mat4 {
    const key = [...casters.map(caster => caster.key), box.min.join(), box.max.join(), direction.join()].join('|');
    if (key === this.key && this.matrix) {
      return this.matrix;
    }
    this.key = key;
    const gl = this.gl;
    const center = boxCenter(box);
    const radius = Math.max(boxDiagonal(box) / 2, 1e-3) * 1.6;
    const eye = center.map((value, axis) => value + direction[axis] * radius * 2) as Vec3;
    const matrix = multiply(orthographic(radius, 0.01, radius * 4), lookAt(eye, center, WORLD_UP));
    const { program, uniforms } = this.depth;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer);
    gl.viewport(0, 0, SIZE, SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, matrix);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 4);
    for (const caster of casters) {
      gl.uniformMatrix4fv(uniforms.uModel, false, caster.world);
      caster.draw();
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.matrix = matrix;
    return matrix;
  }

  // For a program that reads the map in its shadow lookup.
  bind(uniforms: Program['uniforms']): void {
    const gl = this.gl;
    gl.uniform1i(uniforms.uShadow, UNIT);
    gl.activeTexture(gl.TEXTURE0 + UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE0);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteFramebuffer(this.buffer);
    gl.deleteProgram(this.depth.program);
  }
}
