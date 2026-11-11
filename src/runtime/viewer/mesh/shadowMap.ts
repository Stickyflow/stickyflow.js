import type { Vec3 } from '../../../model/mesh';
import { type Box, boxCenter, boxDiagonal } from './camera';
import { type Drawable, link, type Program } from './gl';
import { lookAt, type Mat4, multiply, orthographic } from './matrix';
import { DEPTH_FRAGMENT } from './shaders/mesh';

const WORLD_UP: Vec3 = [0, 1, 0];

// Where a map is read: the name of its sampler, which the names of the rest start with, its texture units and its size. The second
// unit holds the same map again, read as plain distances, to find what casts a shadow.
export interface ShadowSlot {
  name: string;
  unit: number;
  depthUnit: number;
  size: number;
}

export const SUN_SHADOW: ShadowSlot = { name: 'uShadow', unit: 1, depthUnit: 8, size: 2048 };
export const ENVIRONMENT_SHADOW: ShadowSlot = { name: 'uEnvShadow', unit: 9, depthUnit: 10, size: 2048 };

export const shadowUniforms = ({ name }: ShadowSlot): string[] => [name, `${name}Depth`, `${name}Softness`];

// Something that casts a shadow, with what tells whether it has changed since the map was drawn.
export interface Caster extends Drawable {
  key: string;
}

// The scene seen from the sun, as a picture of how far away everything is. It is drawn again only when something that casts a
// shadow has moved, or the sun has.
export class ShadowMap {
  private readonly gl: WebGL2RenderingContext;
  private readonly slot: ShadowSlot;
  private readonly depth: Program;
  private readonly texture: WebGLTexture | null;
  private readonly buffer: WebGLFramebuffer | null;
  private readonly plain: WebGLSampler | null;
  private key = '';
  private matrix: Mat4 | null = null;
  // Half the width of the map in the world, and how deep it reaches.
  private radius = 1;
  private reach = 4;

  constructor(gl: WebGL2RenderingContext, slot: ShadowSlot = SUN_SHADOW) {
    this.gl = gl;
    this.slot = slot;
    this.depth = link(gl, DEPTH_FRAGMENT, ['uModel', 'uViewProjection', 'uNormal', 'uLight']);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, slot.size, slot.size);
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
    this.plain = gl.createSampler();
    gl.samplerParameteri(this.plain, gl.TEXTURE_COMPARE_MODE, gl.NONE);
    gl.samplerParameteri(this.plain, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.samplerParameteri(this.plain, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.samplerParameteri(this.plain, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(this.plain, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
    this.radius = Math.max(boxDiagonal(box) / 2, 1e-3) * 1.6;
    this.reach = this.radius * 4 - 0.01;
    const eye = center.map((value, axis) => value + direction[axis] * this.radius * 2) as Vec3;
    const matrix = multiply(orthographic(this.radius, 0.01, this.radius * 4), lookAt(eye, center, WORLD_UP));
    const { program, uniforms } = this.depth;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer);
    gl.viewport(0, 0, this.slot.size, this.slot.size);
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

  // For a program that reads the map in its shadow lookup, with the size of the sun in degrees.
  bind(uniforms: Program['uniforms'], softness = 0): void {
    const gl = this.gl;
    const { name, unit, depthUnit } = this.slot;
    gl.uniform1i(uniforms[name], unit);
    gl.uniform1i(uniforms[`${name}Depth`], depthUnit);
    // The edge of a shadow widens by the tangent of half the sun for each unit of distance. A depth of the map is a share of its
    // reach, and its width is twice the radius.
    const spread = Math.tan((Math.max(0, softness) * Math.PI) / 360);
    gl.uniform1f(uniforms[`${name}Softness`], (spread * this.reach) / (2 * this.radius));
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE0 + depthUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.bindSampler(depthUnit, this.plain);
    gl.activeTexture(gl.TEXTURE0);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteFramebuffer(this.buffer);
    gl.deleteSampler(this.plain);
    gl.deleteProgram(this.depth.program);
  }
}
