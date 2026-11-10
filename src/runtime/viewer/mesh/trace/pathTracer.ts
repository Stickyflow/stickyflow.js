import type { Vec3 } from '../../../../model/mesh';
import type { Camera } from '../camera';
import { link, type Program, requireObject } from '../gl';
import { invert } from '../matrix';
import { SCREEN_VERTEX } from '../shaders/screen';
import { buildSceneData, type TraceMapName, type TracePart } from './sceneData';
import { TRACE_FRAGMENT } from './shader';

const ROW = 2048;
const MAP_SIZE = 1024;
// The pictures of a material lie in two stacks, two layers each: colors, which are read as light, and plain numbers.
const COLOR_LAYERS: readonly TraceMapName[] = ['base', 'emissive'];
const DATA_LAYERS: readonly TraceMapName[] = ['surface', 'normal'];

const UNIFORMS = [
  'uNodes',
  'uTriangles',
  'uMaterials',
  'uColorMaps',
  'uDataMaps',
  'uEnvironment',
  'uEnvironmentTurn',
  'uEnvironmentStrength',
  'uSkyLevel',
  'uSkyTotal',
  'uEnvDirection',
  'uEnvLight',
  'uSunDirection',
  'uSun',
  'uSunSize',
  'uSunShadows',
  'uFloor',
  'uReflection',
  'uGroundRoughness',
  'uGroundColor',
  'uEnvGround',
  'uSunGround',
  'uCenter',
  'uFade',
  'uStage',
  'uInverse',
  'uEye',
  'uSeed',
  'uExposure',
  'uLift',
  'uSeeThrough',
];

// What one frame of a traced picture is drawn with.
export interface TraceFrame {
  camera: Camera;
  seed: number;
  exposure: number;
  // A small step off a surface, for the size of the scene.
  lift: number;
  // Whether anything in the scene is partly see-through.
  seeThrough: boolean;
  environment: {
    texture: WebGLTexture;
    skyLevel: number;
    turn: number;
    strength: number;
    // All the light of the sky, and the light of this frame: where it is, and its light over how likely it was to be picked.
    total: number;
    direction: Vec3;
    light: Vec3;
  };
  sun: { direction: Vec3; light: Vec3; size: number; shadows: boolean };
  ground: {
    floor: number;
    reflection: number;
    roughness: number;
    color: Vec3;
    // What the shadow of the light of this frame counts for on the page, and how dark the shadow of the sun is there.
    environmentShadow: number;
    sunShadow: number;
    center: Vec3;
    fade: number;
  };
}

interface Scene {
  textures: WebGLTexture[];
}

// Draws frames of a picture by following paths of light through the scene. It holds the scene as textures of numbers, and
// builds them again only when the scene has changed.
export class PathTracer {
  private readonly gl: WebGL2RenderingContext;
  private readonly quad: WebGLVertexArrayObject;
  // Made the first time it is needed. False when this GPU cannot compile it.
  private program: Program | false | null = null;
  private scene: Scene | null = null;
  private key: string | null = null;

  constructor(gl: WebGL2RenderingContext, quad: WebGLVertexArrayObject) {
    this.gl = gl;
    this.quad = quad;
  }

  get possible(): boolean {
    if (this.program === null) {
      try {
        this.program = link(this.gl, TRACE_FRAGMENT, UNIFORMS, SCREEN_VERTEX);
      } catch (failure) {
        console.warn('stickyflow: this GPU cannot trace a picture, so it is drawn the plain way.', failure);
        this.program = false;
      }
    }
    return this.program !== false;
  }

  // Takes the scene, unless it has the one with this key already.
  load(key: string, parts: () => TracePart[]): void {
    if (key === this.key) {
      return;
    }
    this.release();
    this.key = key;
    const gl = this.gl;
    const data = buildSceneData(parts());
    const numbers = (values: Float32Array) => {
      const rows = Math.max(1, Math.ceil(values.length / 4 / ROW));
      const padded = new Float32Array(rows * ROW * 4);
      padded.set(values);
      const texture = requireObject(gl.createTexture(), 'texture');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ROW, rows, 0, gl.RGBA, gl.FLOAT, padded);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return texture;
    };
    const stack = (format: number, names: readonly TraceMapName[]) => {
      const texture = requireObject(gl.createTexture(), 'texture');
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, format, MAP_SIZE, MAP_SIZE, Math.max(1, data.textured.length * 2));
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
      // Each picture is copied into its layer, at the size of the stack.
      const from = gl.createFramebuffer();
      const to = gl.createFramebuffer();
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, from);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to);
      data.textured.forEach((part, index) => {
        names.forEach((name, layer) => {
          const map = part.maps[name];
          if (!map) {
            return;
          }
          gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, map.texture, 0);
          gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 0, index * 2 + layer);
          gl.blitFramebuffer(0, 0, map.width, map.height, 0, 0, MAP_SIZE, MAP_SIZE, gl.COLOR_BUFFER_BIT, gl.LINEAR);
        });
      });
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.deleteFramebuffer(from);
      gl.deleteFramebuffer(to);
      return texture;
    };
    this.scene = {
      textures: [
        numbers(data.nodes),
        numbers(data.triangles),
        numbers(data.materials),
        stack(gl.SRGB8_ALPHA8, COLOR_LAYERS),
        stack(gl.RGBA8, DATA_LAYERS),
      ],
    };
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  }

  // Draws one frame into the target that is bound.
  draw(frame: TraceFrame): void {
    const { gl, scene } = this;
    const program = this.program;
    if (!scene || !program) {
      return;
    }
    const { uniforms } = program;
    const { camera, environment, sun, ground } = frame;
    gl.useProgram(program.program);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    scene.textures.forEach((texture, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(unit < 3 ? gl.TEXTURE_2D : gl.TEXTURE_2D_ARRAY, texture);
    });
    gl.activeTexture(gl.TEXTURE0 + 5);
    gl.bindTexture(gl.TEXTURE_2D, environment.texture);
    ['uNodes', 'uTriangles', 'uMaterials', 'uColorMaps', 'uDataMaps', 'uEnvironment'].forEach((name, unit) => {
      gl.uniform1i(uniforms[name], unit);
    });
    const turn = (environment.turn * Math.PI) / 180;
    gl.uniform2f(uniforms.uEnvironmentTurn, Math.cos(turn), Math.sin(turn));
    gl.uniform1f(uniforms.uEnvironmentStrength, environment.strength);
    gl.uniform1f(uniforms.uSkyLevel, environment.skyLevel);
    gl.uniform1f(uniforms.uSkyTotal, environment.total);
    gl.uniform3fv(uniforms.uEnvDirection, environment.direction);
    gl.uniform3fv(uniforms.uEnvLight, environment.light);
    gl.uniform3fv(uniforms.uSunDirection, sun.direction);
    gl.uniform3fv(uniforms.uSun, sun.light);
    gl.uniform1f(uniforms.uSunSize, sun.size);
    gl.uniform1i(uniforms.uSunShadows, sun.shadows ? 1 : 0);
    gl.uniform1f(uniforms.uFloor, ground.floor);
    gl.uniform1f(uniforms.uReflection, ground.reflection);
    gl.uniform1f(uniforms.uGroundRoughness, ground.roughness);
    gl.uniform3fv(uniforms.uGroundColor, ground.color);
    gl.uniform1f(uniforms.uEnvGround, ground.environmentShadow);
    gl.uniform1f(uniforms.uSunGround, ground.sunShadow);
    gl.uniform3fv(uniforms.uCenter, ground.center);
    gl.uniform1f(uniforms.uFade, ground.fade);
    gl.uniformMatrix4fv(uniforms.uStage, false, camera.stage);
    gl.uniformMatrix4fv(uniforms.uInverse, false, invert(camera.viewProjection));
    gl.uniform3fv(uniforms.uEye, camera.eye);
    gl.uniform1f(uniforms.uSeed, frame.seed);
    gl.uniform1f(uniforms.uExposure, frame.exposure);
    gl.uniform1f(uniforms.uLift, frame.lift);
    gl.uniform1i(uniforms.uSeeThrough, frame.seeThrough ? 1 : 0);
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    for (const unit of [3, 4]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
  }

  private release(): void {
    for (const texture of this.scene?.textures ?? []) {
      this.gl.deleteTexture(texture);
    }
    this.scene = null;
    this.key = null;
  }

  destroy(): void {
    this.release();
    if (this.program) {
      this.gl.deleteProgram(this.program.program);
    }
    this.program = null;
  }
}
