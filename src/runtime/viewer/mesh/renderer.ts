import type { Mesh, Vec3 } from '../../../model/mesh';
import type { MeshAsset, MeshPrimitive } from './glb';
import {
  cross,
  dot,
  lookAt,
  type Mat4,
  modelMatrix,
  multiply,
  normalize,
  normalMatrix,
  orthographic,
  perspective,
  transformPoint,
} from './matrix';

const VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormal;
uniform mat4 uLight;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vShadow;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = uNormal * aNormal;
  vUv = aUv;
  vShadow = uLight * world;
  gl_Position = uViewProjection * world;
}`;

const SHADOW_LOOKUP = `
uniform highp sampler2DShadow uShadow;
uniform float uShadowOn;
in vec4 vShadow;
float lit() {
  if (uShadowOn < 0.5) {
    return 1.0;
  }
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  float sum = 0.0;
  vec2 step = 1.0 / vec2(textureSize(uShadow, 0));
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      sum += texture(uShadow, vec3(p.xy + vec2(x, y) * step, p.z - 0.0015));
    }
  }
  return sum / 25.0;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec4 uBase;
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uEye;
uniform bool uHasTexture;
uniform sampler2D uTexture;
out vec4 fragment;
${SHADOW_LOOKUP}
const float PI = 3.14159265;
const vec3 KEY = vec3(0.55, 0.75, 0.35);
const vec3 FILL = vec3(-0.6, 0.3, 0.7);

// A room worked out from a direction: a bright sky, a dark floor and one soft window, blurrier the rougher the surface is.
vec3 room(vec3 d, float roughness) {
  float blur = 0.08 + roughness * 0.6;
  vec3 color = mix(vec3(0.16, 0.15, 0.14), vec3(0.78, 0.82, 0.9), smoothstep(-blur, blur, d.y));
  float window = pow(max(dot(d, normalize(KEY)), 0.0), mix(160.0, 3.0, roughness));
  return color + vec3(1.0, 0.97, 0.92) * window * mix(3.0, 0.25, roughness);
}

vec3 light(vec3 n, vec3 v, vec3 l, vec3 radiance, vec3 albedo, vec3 f0, float roughness, float metallic) {
  vec3 h = normalize(v + l);
  float nl = max(dot(n, l), 0.0);
  float nv = max(dot(n, v), 0.001);
  float nh = max(dot(n, h), 0.0);
  float a = roughness * roughness;
  float a2 = a * a;
  float d = a2 / max(PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0), 0.0001);
  float k = pow(roughness + 1.0, 2.0) / 8.0;
  float g = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  vec3 f = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
  vec3 specular = d * g * f / max(4.0 * nv * nl, 0.001);
  vec3 diffuse = (1.0 - f) * (1.0 - metallic) * albedo / PI;
  return (diffuse + specular) * radiance * nl;
}

void main() {
  vec4 base = uBase;
  if (uHasTexture) {
    base *= texture(uTexture, vUv);
  }
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) {
    n = -n;
  }
  float roughness = clamp(uRoughness, 0.04, 1.0);
  float metallic = clamp(uMetallic, 0.0, 1.0);
  vec3 f0 = mix(vec3(0.04), base.rgb, metallic);
  float nv = max(dot(n, v), 0.001);
  vec3 color = light(n, v, normalize(KEY), vec3(2.8), base.rgb, f0, roughness, metallic) * lit();
  color += light(n, v, normalize(FILL), vec3(0.5), base.rgb, f0, roughness, metallic);
  // What the room gives, by a short form of the usual table of how a rough surface reflects.
  vec4 r = roughness * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a004 = min(r.x * r.x, pow(2.0, -9.28 * nv)) * r.x + r.y;
  vec2 ab = vec2(-1.04, 1.04) * a004 + r.zw;
  vec3 fresnel = f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(1.0 - nv, 5.0);
  color += room(reflect(-v, n), roughness) * (fresnel * ab.x + ab.y);
  color += room(n, 1.0) * base.rgb * (1.0 - metallic) * 0.55;
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 2.2));
  fragment = vec4(color * base.a, base.a);
}`;

const DEPTH_FRAGMENT = `#version 300 es
precision highp float;
void main() {}`;

// What lies under a pixel: which mesh in two channels, and how far away in two more.
const PROBE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uEye;
uniform float uRange;
uniform vec2 uId;
out vec4 fragment;
void main() {
  float far = clamp(length(vWorld - uEye) / uRange, 0.0, 1.0) * 65535.0;
  fragment = vec4(uId, floor(far / 256.0) / 255.0, mod(floor(far), 256.0) / 255.0);
}`;

// Only the shadow is drawn, so the page stays visible where there is none.
const GROUND_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCenter;
uniform float uFade;
out vec4 fragment;
${SHADOW_LOOKUP}
void main() {
  float fade = 1.0 - smoothstep(uFade * 0.6, uFade, length(vWorld.xz - uCenter.xz));
  fragment = vec4(0.0, 0.0, 0.0, (1.0 - lit()) * 0.32 * fade);
}`;

const PLANE_VERTEX = `attribute vec2 aPosition;
uniform mat4 uMvp;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = uMvp * vec4(aPosition, 0.0, 1.0);
}`;

const PLANE_FRAGMENT = `precision highp float;
uniform sampler2D uPicture;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uPicture, vUv);
  if (color.a < 0.004) {
    discard;
  }
  gl_FragColor = color;
}`;

// One layer of a flat surface: a picture, or a shader with the part of the surface it covers, as left, top, width and height from 0 to 1.
export type PlaneLayer =
  | { texture: WebGLTexture }
  | { program: WebGLProgram; upload(): void; rect: readonly [number, number, number, number] };

export interface Plane {
  id: string;
  // Takes a square from -1 to 1 to its place in the world.
  matrix: Mat4;
  layers: readonly PlaneLayer[];
}

export interface PlaneHit {
  distance: number;
  // From 0 to 1 and from the top left, also beyond the edges of the surface.
  x: number;
  y: number;
}

interface GpuPrimitive {
  vao: WebGLVertexArrayObject;
  buffers: WebGLBuffer[];
  count: number;
  indexType?: number;
  transform: Mat4;
  source: MeshPrimitive;
  min: Vec3;
  max: Vec3;
  texture?: WebGLTexture;
}

export interface MeshFrame {
  center: Vec3;
  radius: number;
  distance: number;
}

export interface Camera {
  eye: Vec3;
  // What is drawn: only the part of the stage in `window`, which fills the canvas.
  viewProjection: Mat4;
  // The whole stage, from -1 to 1.
  stage: Mat4;
  window: Window;
  range: number;
  back: Vec3;
  right: Vec3;
  up: Vec3;
  aspect: number;
}

export type Window = readonly [left: number, bottom: number, right: number, top: number];

const WHOLE_STAGE: Window = [-1, -1, 1, 1];

interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const FOV = (32 * Math.PI) / 180;
const WORLD_UP: Vec3 = [0, 1, 0];
const FRAME_MARGIN = 1.04;
const LIGHT_DIRECTION = normalize([0.55, 0.75, 0.35]);
const SHADOW_SIZE = 2048;
const OCCLUSION_MARGIN = 0.004;

function eyeDirection(yawDegrees: number, pitchDegrees: number): Vec3 {
  const yaw = (yawDegrees * Math.PI) / 180;
  const pitch = (pitchDegrees * Math.PI) / 180;
  return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('WebGL2 could not make a shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WebGL2 shader: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, fragmentSource: string, names: readonly string[]): Program {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('WebGL2 could not make a program');
  }
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL2 program: ${gl.getProgramInfoLog(program)}`);
  }
  return { program, uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) };
}

export function colorOf(hex: string | undefined): [number, number, number] | undefined {
  const digits = hex?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!digits) {
    return undefined;
  }
  const full = digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits;
  // sRGB to linear, as the lights work in linear values.
  return [0, 2, 4].map(start => (Number.parseInt(full.slice(start, start + 2), 16) / 255) ** 2.2) as [
    number,
    number,
    number,
  ];
}

// Draws meshes with WebGL2. It knows nothing of SFL or SVG: it gets assets, and what the document says about each mesh.
export class MeshRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly main: Program;
  private readonly depth: Program;
  private readonly probing: Program;
  private readonly ground: Program;
  private readonly picture: WebGLProgram;
  private readonly planePrograms = new Map<string, WebGLProgram>();
  private readonly planeQuad: WebGLVertexArrayObject | null;
  readonly planeBuffer: WebGLBuffer | null;
  private readonly assets = new Map<string, GpuPrimitive[]>();
  private readonly shadowMap: WebGLTexture | null;
  private readonly shadowBuffer: WebGLFramebuffer | null;
  private readonly groundQuad: WebGLVertexArrayObject | null;
  private readonly groundBuffer: WebGLBuffer | null;
  private probeBuffer: WebGLFramebuffer | null = null;
  private probeColor: WebGLTexture | null = null;
  private probeDepth: WebGLRenderbuffer | null = null;
  private probeSize = '';

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const common = ['uModel', 'uViewProjection', 'uNormal', 'uLight'];
    const shadow = ['uShadow', 'uShadowOn'];
    this.main = link(gl, FRAGMENT, [
      ...common,
      ...shadow,
      'uBase',
      'uMetallic',
      'uRoughness',
      'uEye',
      'uHasTexture',
      'uTexture',
    ]);
    this.depth = link(gl, DEPTH_FRAGMENT, common);
    this.probing = link(gl, PROBE_FRAGMENT, [...common, 'uEye', 'uRange', 'uId']);
    this.ground = link(gl, GROUND_FRAGMENT, [...common, ...shadow, 'uCenter', 'uFade']);

    this.picture = this.linkPlane(PLANE_FRAGMENT);
    this.planeQuad = gl.createVertexArray();
    this.planeBuffer = gl.createBuffer();
    gl.bindVertexArray(this.planeQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.planeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.shadowMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shadowBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowMap, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.groundQuad = gl.createVertexArray();
    this.groundBuffer = gl.createBuffer();
    gl.bindVertexArray(this.groundQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  // A program for a surface, kept for all that use the same one. It is written in the older form of the language, as shaders are.
  linkPlane(fragmentSource: string): WebGLProgram {
    const known = this.planePrograms.get(fragmentSource);
    if (known) {
      return known;
    }
    const { gl } = this;
    const program = gl.createProgram();
    if (!program) {
      throw new Error('WebGL2 could not make a program');
    }
    const vertex = compile(gl, gl.VERTEX_SHADER, PLANE_VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL2 program: ${gl.getProgramInfoLog(program)}`);
    }
    this.planePrograms.set(fragmentSource, program);
    return program;
  }

  // A picture for a surface, with smaller copies, so that small text does not flicker.
  planeTexture(source: TexImageSource): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('WebGL2 could not make a texture');
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
    if (anisotropic) {
      gl.texParameterf(
        gl.TEXTURE_2D,
        anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(8, gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
      );
    }
    return texture;
  }

  deleteTexture(texture: WebGLTexture): void {
    this.gl.deleteTexture(texture);
  }

  // Where a ray through a point of the stage, from -1 to 1, meets a surface.
  planeHit(camera: Camera, plane: Plane, x: number, y: number): PlaneHit | undefined {
    const m = plane.matrix;
    const across: Vec3 = [m[0], m[1], m[2]];
    const along: Vec3 = [m[4], m[5], m[6]];
    const origin: Vec3 = [m[12], m[13], m[14]];
    const tan = Math.tan(FOV / 2);
    const direction = [0, 1, 2].map(
      axis => -camera.back[axis] + camera.right[axis] * x * tan * camera.aspect + camera.up[axis] * y * tan,
    );
    const normal = cross(across, along);
    const facing = dot(direction, normal);
    if (Math.abs(facing) < 1e-9) {
      return undefined;
    }
    const toOrigin = origin.map((value, axis) => value - camera.eye[axis]);
    const t = dot(toOrigin, normal) / facing;
    if (t <= 0) {
      return undefined;
    }
    const offset = direction.map((value, axis) => camera.eye[axis] + value * t - origin[axis]);
    return {
      distance: t * Math.hypot(direction[0], direction[1], direction[2]),
      x: (dot(offset, across) / dot(across, across) + 1) / 2,
      y: (1 - dot(offset, along) / dot(along, along)) / 2,
    };
  }

  // How far away the mesh under a point of the canvas is.
  meshDistance(meshes: readonly Mesh[], camera: Camera, x: number, y: number): number | undefined {
    return this.probe(meshes, camera, x, y)?.distance;
  }

  hasAsset(asset: string): boolean {
    return this.assets.has(asset);
  }

  addAsset(asset: string, mesh: MeshAsset): void {
    this.assets.set(
      asset,
      mesh.primitives.map(primitive => this.upload(primitive)),
    );
  }

  setTexture(asset: string, primitiveIndex: number, image: ImageBitmap): void {
    const primitive = this.assets.get(asset)?.[primitiveIndex];
    if (!primitive) {
      return;
    }
    const { gl } = this;
    const { sampler } = primitive.source.material;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler?.magFilter ?? gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampler?.minFilter ?? gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, sampler?.wrapS ?? gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, sampler?.wrapT ?? gl.REPEAT);
    primitive.texture = texture ?? undefined;
  }

  private upload(source: MeshPrimitive): GpuPrimitive {
    const { gl } = this;
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('WebGL2 could not make a vertex array');
    }
    gl.bindVertexArray(vao);
    const attribute = (location: number, data: Float32Array, size: number): WebGLBuffer | null => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      return buffer;
    };
    const buffers = [attribute(0, source.positions, 3), attribute(1, source.normals, 3)];
    if (source.uvs) {
      buffers.push(attribute(2, source.uvs, 2));
    }
    let indexType: number | undefined;
    if (source.indices) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, source.indices, gl.STATIC_DRAW);
      buffers.push(buffer);
      indexType =
        source.indices instanceof Uint32Array
          ? gl.UNSIGNED_INT
          : source.indices instanceof Uint16Array
            ? gl.UNSIGNED_SHORT
            : gl.UNSIGNED_BYTE;
    }
    gl.bindVertexArray(null);
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    const { positions } = source;
    for (let i = 0; i < positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], positions[i + axis]);
        max[axis] = Math.max(max[axis], positions[i + axis]);
      }
    }
    return {
      vao,
      buffers: buffers.filter((buffer): buffer is WebGLBuffer => buffer !== null),
      count: source.indices ? source.indices.length : source.positions.length / 3,
      indexType,
      transform: source.transform,
      source,
      min,
      max,
    };
  }

  // The box around the meshes, from the corners of the box of each part, so it costs the same for a million triangles.
  box(meshes: readonly Mesh[], planes: readonly Plane[] = []): { min: Vec3; max: Vec3 } | undefined {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const mesh of meshes) {
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        const world = multiply(placed, primitive.transform);
        for (let index = 0; index < 8; index++) {
          const point = transformPoint(world, [
            index & 1 ? primitive.max[0] : primitive.min[0],
            index & 2 ? primitive.max[1] : primitive.min[1],
            index & 4 ? primitive.max[2] : primitive.min[2],
          ]);
          for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], point[axis]);
            max[axis] = Math.max(max[axis], point[axis]);
          }
        }
      }
    }
    for (const plane of planes) {
      for (const [x, y] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const point = transformPoint(plane.matrix, [x, y, 0]);
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], point[axis]);
          max[axis] = Math.max(max[axis], point[axis]);
        }
      }
    }
    return Number.isFinite(min[0]) ? { min, max } : undefined;
  }

  // Where the camera stands to show all the meshes from this side: as near as the corners of the scene allow.
  frame(
    meshes: readonly Mesh[],
    yawDegrees: number,
    pitchDegrees: number,
    aspect: number,
    groundShadow = false,
    planes: readonly Plane[] = [],
  ): MeshFrame | undefined {
    const box = this.box(meshes, planes);
    if (!box) {
      return undefined;
    }
    const { min, max } = box;
    if (groundShadow) {
      // The shadow falls away from the light, as far as the scene is high.
      const height = max[1] - min[1];
      min[0] -= (height * LIGHT_DIRECTION[0]) / LIGHT_DIRECTION[1];
      min[2] -= (height * LIGHT_DIRECTION[2]) / LIGHT_DIRECTION[1];
    }
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const radius = Math.max(Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2, 1e-3);
    const tanV = Math.tan(FOV / 2);
    const back = eyeDirection(yawDegrees, pitchDegrees);
    const right = normalize(cross(WORLD_UP, back));
    const up = cross(back, right);
    let distance = 0;
    for (let index = 0; index < 8; index++) {
      const corner = [
        (index & 1 ? max[0] : min[0]) - center[0],
        (index & 2 ? max[1] : min[1]) - center[1],
        (index & 4 ? max[2] : min[2]) - center[2],
      ];
      const toward = dot(corner, back);
      distance = Math.max(
        distance,
        Math.abs(dot(corner, right)) / (tanV * aspect) + toward,
        Math.abs(dot(corner, up)) / tanV + toward,
      );
    }
    return { center, radius, distance: distance * FRAME_MARGIN };
  }

  camera(
    frame: MeshFrame,
    yawDegrees: number,
    pitchDegrees: number,
    aspect: number,
    window: Window = WHOLE_STAGE,
  ): Camera {
    const { center, radius, distance } = frame;
    const back = eyeDirection(yawDegrees, pitchDegrees);
    const eye: Vec3 = [center[0] + back[0] * distance, center[1] + back[1] * distance, center[2] + back[2] * distance];
    const range = distance + radius * 4;
    const stage = multiply(
      perspective(FOV, aspect, Math.max(distance - radius * 4, distance * 0.01), range),
      lookAt(eye, center, WORLD_UP),
    );
    const [left, bottom, right, top] = window;
    const zoomX = 2 / (right - left);
    const zoomY = 2 / (top - bottom);
    const crop = new Float32Array([
      zoomX,
      0,
      0,
      0,
      0,
      zoomY,
      0,
      0,
      0,
      0,
      1,
      0,
      -(right + left) / (right - left),
      -(top + bottom) / (top - bottom),
      0,
      1,
    ]);
    const side = normalize(cross(WORLD_UP, back));
    return {
      eye,
      range,
      stage,
      window,
      viewProjection: multiply(crop, stage),
      back,
      right: side,
      up: cross(back, side),
      aspect,
    };
  }

  // A point on the screen from -1 to 1 and its depth, or undefined behind the camera.
  project(camera: Camera, point: ArrayLike<number>, offset = 0): Vec3 | undefined {
    const m = camera.stage;
    const [x, y, z] = [point[offset], point[offset + 1], point[offset + 2]];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (w <= 0) {
      return undefined;
    }
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
    ];
  }

  private prepareProbe(): void {
    const { gl } = this;
    const size = `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
    if (size === this.probeSize && this.probeBuffer) {
      return;
    }
    this.releaseProbe();
    this.probeSize = size;
    this.probeBuffer = gl.createFramebuffer();
    this.probeColor = gl.createTexture();
    this.probeDepth = gl.createRenderbuffer();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.probeColor);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.probeDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.probeBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.probeColor, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.probeDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private releaseProbe(): void {
    const { gl } = this;
    gl.deleteFramebuffer(this.probeBuffer);
    gl.deleteTexture(this.probeColor);
    gl.deleteRenderbuffer(this.probeDepth);
    this.probeBuffer = null;
  }

  // Draws only the one pixel under a point of the screen, so the cost does not depend on how it is asked: a mesh of any size is one lookup.
  private probe(
    meshes: readonly Mesh[],
    camera: Camera,
    x: number,
    y: number,
  ): { index: number; distance: number } | null {
    const { gl } = this;
    this.prepareProbe();
    const px = Math.max(0, Math.min(gl.drawingBufferWidth - 1, Math.floor(((x + 1) / 2) * gl.drawingBufferWidth)));
    const py = Math.max(0, Math.min(gl.drawingBufferHeight - 1, Math.floor(((y + 1) / 2) * gl.drawingBufferHeight)));
    const { program, uniforms } = this.probing;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.probeBuffer);
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
    meshes.forEach((mesh, index) => {
      const id = index + 1;
      gl.uniform2f(uniforms.uId, (id >> 8) / 255, (id & 255) / 255);
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        gl.uniformMatrix4fv(uniforms.uModel, false, multiply(placed, primitive.transform));
        this.drawPrimitive(primitive);
      }
    });
    const pixel = new Uint8Array(4);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const id = (pixel[0] << 8) | pixel[1];
    return id === 0 ? null : { index: id - 1, distance: (((pixel[2] << 8) | pixel[3]) / 65535) * camera.range };
  }

  pick(meshes: readonly Mesh[], camera: Camera, x: number, y: number): string | null {
    const hit = this.probe(meshes, camera, x, y);
    return hit ? (meshes[hit.index]?.id ?? null) : null;
  }

  // Whether a mesh lies between the camera and a point of the world.
  occluded(meshes: readonly Mesh[], camera: Camera, point: readonly number[]): boolean {
    const projected = this.project(camera, point);
    if (!projected) {
      return false;
    }
    const [left, bottom, right, top] = camera.window;
    if (projected[0] < left || projected[0] > right || projected[1] < bottom || projected[1] > top) {
      return false;
    }
    const hit = this.probe(
      meshes,
      camera,
      ((projected[0] - left) / (right - left)) * 2 - 1,
      ((projected[1] - bottom) / (top - bottom)) * 2 - 1,
    );
    const away = Math.hypot(point[0] - camera.eye[0], point[1] - camera.eye[1], point[2] - camera.eye[2]);
    return hit !== null && hit.distance < away - camera.range * OCCLUSION_MARGIN;
  }

  private drawPrimitive(primitive: GpuPrimitive): void {
    const { gl } = this;
    gl.bindVertexArray(primitive.vao);
    if (primitive.indexType === undefined) {
      gl.drawArrays(gl.TRIANGLES, 0, primitive.count);
    } else {
      gl.drawElements(gl.TRIANGLES, primitive.count, primitive.indexType, 0);
    }
  }

  // The scene seen from the light, as a picture of how far away everything is.
  private drawShadowMap(meshes: readonly Mesh[], planes: readonly Plane[], box: { min: Vec3; max: Vec3 }): Mat4 {
    const { gl } = this;
    const { min, max } = box;
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const radius = Math.max(Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2, 1e-3) * 1.6;
    const eye: Vec3 = [
      center[0] + LIGHT_DIRECTION[0] * radius * 2,
      center[1] + LIGHT_DIRECTION[1] * radius * 2,
      center[2] + LIGHT_DIRECTION[2] * radius * 2,
    ];
    const lightMatrix = multiply(orthographic(radius, 0.01, radius * 4), lookAt(eye, center, WORLD_UP));
    const { program, uniforms } = this.depth;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, lightMatrix);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 4);
    for (const mesh of meshes) {
      if (mesh.opacity < 0.5) {
        continue;
      }
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        gl.uniformMatrix4fv(uniforms.uModel, false, multiply(placed, primitive.transform));
        this.drawPrimitive(primitive);
      }
    }
    gl.bindVertexArray(this.planeQuad);
    for (const plane of planes) {
      gl.uniformMatrix4fv(uniforms.uModel, false, plane.matrix);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return lightMatrix;
  }

  draw(
    meshes: readonly Mesh[],
    camera: Camera | undefined,
    options: { groundShadow?: boolean; planes?: readonly Plane[] } = {},
  ): void {
    const planes = options.planes ?? [];
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const box = this.box(meshes, planes);
    if (!camera || !box) {
      return;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const lightMatrix = this.drawShadowMap(meshes, planes, box);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);

    const { program, uniforms } = this.main;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    gl.uniform1i(uniforms.uTexture, 0);
    gl.uniform1i(uniforms.uShadow, 1);
    gl.uniform1f(uniforms.uShadowOn, 1);
    gl.activeTexture(gl.TEXTURE0);

    const see = (mesh: Mesh, primitive: GpuPrimitive) => mesh.opacity < 1 || primitive.source.material.blend;
    this.drawWhere(meshes, (mesh, primitive) => !see(mesh, primitive));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (options.groundShadow) {
      this.drawGround(camera, lightMatrix, box);
      gl.useProgram(program);
    }
    this.drawPlanes(camera, planes);
    gl.useProgram(program);
    gl.depthMask(false);
    this.drawWhere(meshes, see);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  // The layers of a surface lie in one plane, so each is pulled a little toward the camera over the one before.
  private drawPlanes(camera: Camera, planes: readonly Plane[]): void {
    const { gl } = this;
    gl.bindVertexArray(this.planeQuad);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.activeTexture(gl.TEXTURE0);
    for (const plane of planes) {
      plane.layers.forEach((layer, index) => {
        gl.polygonOffset(-index - 1, -index - 1);
        let matrix = plane.matrix;
        let program = this.picture;
        if ('rect' in layer) {
          const [left, top, width, height] = layer.rect;
          program = layer.program;
          matrix = multiply(
            matrix,
            new Float32Array([
              width,
              0,
              0,
              0,
              0,
              height,
              0,
              0,
              0,
              0,
              1,
              0,
              left * 2 + width - 1,
              1 - top * 2 - height,
              0,
              1,
            ]),
          );
        }
        gl.useProgram(program);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uMvp'), false, multiply(camera.viewProjection, matrix));
        if ('rect' in layer) {
          layer.upload();
        } else {
          gl.bindTexture(gl.TEXTURE_2D, layer.texture);
          gl.uniform1i(gl.getUniformLocation(program, 'uPicture'), 0);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
  }

  private drawGround(camera: Camera, lightMatrix: Mat4, box: { min: Vec3; max: Vec3 }): void {
    const { gl } = this;
    const { program, uniforms } = this.ground;
    const { min, max } = box;
    const center: Vec3 = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
    const reach = Math.max(Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]), 1e-3) * 1.4;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix(center, [0, 0, 0], [reach, 1, reach]));
    gl.uniform1i(uniforms.uShadow, 1);
    gl.uniform1f(uniforms.uShadowOn, 1);
    gl.uniform3fv(uniforms.uCenter, center);
    gl.uniform1f(uniforms.uFade, reach);
    gl.depthMask(false);
    gl.bindVertexArray(this.groundQuad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.depthMask(true);
  }

  private drawWhere(meshes: readonly Mesh[], keep: (mesh: Mesh, primitive: GpuPrimitive) => boolean): void {
    const { gl } = this;
    const { uniforms } = this.main;
    for (const mesh of meshes) {
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      const tint = colorOf(mesh.color);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        if (!keep(mesh, primitive)) {
          continue;
        }
        const { material } = primitive.source;
        const world = multiply(placed, primitive.transform);
        gl.uniformMatrix4fv(uniforms.uModel, false, world);
        gl.uniformMatrix3fv(uniforms.uNormal, false, normalMatrix(world));
        const [r, g, b] = tint ?? material.baseColor;
        gl.uniform4f(uniforms.uBase, r, g, b, material.baseColor[3] * mesh.opacity);
        gl.uniform1f(uniforms.uMetallic, mesh.metallic ?? material.metallic);
        gl.uniform1f(uniforms.uRoughness, mesh.roughness ?? material.roughness);
        gl.uniform1i(uniforms.uHasTexture, primitive.texture ? 1 : 0);
        gl.bindTexture(gl.TEXTURE_2D, primitive.texture ?? null);
        this.drawPrimitive(primitive);
      }
    }
  }

  destroy(): void {
    const { gl } = this;
    for (const primitives of this.assets.values()) {
      for (const primitive of primitives) {
        gl.deleteVertexArray(primitive.vao);
        for (const buffer of primitive.buffers) {
          gl.deleteBuffer(buffer);
        }
        if (primitive.texture) {
          gl.deleteTexture(primitive.texture);
        }
      }
    }
    this.assets.clear();
    this.releaseProbe();
    for (const program of this.planePrograms.values()) {
      gl.deleteProgram(program);
    }
    gl.deleteVertexArray(this.planeQuad);
    gl.deleteBuffer(this.planeBuffer);
    gl.deleteTexture(this.shadowMap);
    gl.deleteFramebuffer(this.shadowBuffer);
    gl.deleteVertexArray(this.groundQuad);
    gl.deleteBuffer(this.groundBuffer);
    for (const { program } of [this.main, this.depth, this.probing, this.ground]) {
      gl.deleteProgram(program);
    }
  }
}
