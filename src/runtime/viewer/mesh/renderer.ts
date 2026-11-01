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
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = uNormal * aNormal;
  vUv = aUv;
  gl_Position = uViewProjection * world;
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
const float PI = 3.14159265;
const vec3 KEY = vec3(0.55, 0.75, 0.35);
const vec3 FILL = vec3(-0.6, 0.3, 0.7);

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
  vec3 color = light(n, v, normalize(KEY), vec3(3.2), base.rgb, f0, roughness, metallic);
  color += light(n, v, normalize(FILL), vec3(0.9), base.rgb, f0, roughness, metallic);
  // A sky above and a ground below, so a metal has something to show where no light falls.
  vec3 sky = mix(vec3(0.22, 0.21, 0.2), vec3(0.62, 0.65, 0.7), n.y * 0.5 + 0.5);
  color += sky * mix(base.rgb, f0, metallic * 0.7) * mix(1.0, 0.75, metallic);
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 2.2));
  fragment = vec4(color * base.a, base.a);
}`;

export interface MeshFrame {
  center: Vec3;
  radius: number;
  distance: number;
}

export interface Camera {
  eye: Vec3;
  viewProjection: Mat4;
}

interface GpuPrimitive {
  vao: WebGLVertexArrayObject;
  buffers: WebGLBuffer[];
  count: number;
  indexType?: number;
  transform: Mat4;
  source: MeshPrimitive;
  texture?: WebGLTexture;
}

const FOV = (32 * Math.PI) / 180;
const WORLD_UP: Vec3 = [0, 1, 0];
const FRAME_MARGIN = 1.04;

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
  private readonly program: WebGLProgram;
  private readonly uniforms: Record<string, WebGLUniformLocation | null> = {};
  private readonly assets = new Map<string, GpuPrimitive[]>();

  private readonly gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const program = gl.createProgram();
    if (!program) {
      throw new Error('WebGL2 could not make a program');
    }
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL2 program: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    for (const name of [
      'uModel',
      'uViewProjection',
      'uNormal',
      'uBase',
      'uMetallic',
      'uRoughness',
      'uEye',
      'uHasTexture',
      'uTexture',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
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
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
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
    return {
      vao,
      buffers: buffers.filter((buffer): buffer is WebGLBuffer => buffer !== null),
      count: source.indices ? source.indices.length : source.positions.length / 3,
      indexType,
      transform: source.transform,
      source,
    };
  }

  box(meshes: readonly Mesh[]): { min: Vec3; max: Vec3 } | undefined {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const mesh of meshes) {
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        const world = multiply(placed, primitive.transform);
        const { positions } = primitive.source;
        for (let i = 0; i < positions.length; i += 3) {
          const point = transformPoint(world, positions, i);
          for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], point[axis]);
            max[axis] = Math.max(max[axis], point[axis]);
          }
        }
      }
    }
    return Number.isFinite(min[0]) ? { min, max } : undefined;
  }

  // Where the camera stands to show all the meshes from this side: as near as the corners of the scene allow.
  frame(meshes: readonly Mesh[], yawDegrees: number, pitchDegrees: number): MeshFrame | undefined {
    const box = this.box(meshes);
    if (!box) {
      return undefined;
    }
    const { min, max } = box;
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const radius = Math.max(Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2, 1e-3);
    const { gl } = this;
    const aspect = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
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

  camera(frame: MeshFrame, yawDegrees: number, pitchDegrees: number): Camera {
    const { gl } = this;
    const aspect = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
    const { center, radius, distance } = frame;
    const back = eyeDirection(yawDegrees, pitchDegrees);
    const eye: Vec3 = [center[0] + back[0] * distance, center[1] + back[1] * distance, center[2] + back[2] * distance];
    return {
      eye,
      viewProjection: multiply(
        perspective(FOV, aspect, Math.max(distance - radius * 4, distance * 0.01), distance + radius * 4),
        lookAt(eye, center, WORLD_UP),
      ),
    };
  }

  // A point on the screen from -1 to 1 and its depth, or undefined behind the camera.
  project(camera: Camera, point: ArrayLike<number>, offset = 0): Vec3 | undefined {
    const m = camera.viewProjection;
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

  // The mesh under a point of the screen: the triangle nearest to the camera decides.
  pick(meshes: readonly Mesh[], camera: Camera, x: number, y: number): string | null {
    let found: string | null = null;
    let nearest = Infinity;
    for (const mesh of meshes) {
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        const world = multiply(placed, primitive.transform);
        const { positions, indices } = primitive.source;
        const corner = (index: number) => this.project(camera, transformPoint(world, positions, index * 3));
        const count = indices ? indices.length : positions.length / 3;
        for (let i = 0; i + 2 < count; i += 3) {
          const a = corner(indices ? indices[i] : i);
          const b = corner(indices ? indices[i + 1] : i + 1);
          const c = corner(indices ? indices[i + 2] : i + 2);
          if (!a || !b || !c) {
            continue;
          }
          const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
          if (Math.abs(area) < 1e-9) {
            continue;
          }
          const u = ((x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1])) / area;
          const v = ((b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1])) / area;
          if (u < 0 || v < 0 || u + v > 1) {
            continue;
          }
          const depth = a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]);
          if (depth < nearest) {
            nearest = depth;
            found = mesh.id;
          }
        }
      }
    }
    return found;
  }

  draw(meshes: readonly Mesh[], camera: Camera | undefined): void {
    const { gl } = this;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!camera) {
      return;
    }
    const { eye, viewProjection } = camera;
    gl.useProgram(this.program);
    gl.enable(gl.DEPTH_TEST);
    gl.uniformMatrix4fv(this.uniforms.uViewProjection, false, viewProjection);
    gl.uniform3fv(this.uniforms.uEye, eye);
    gl.uniform1i(this.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);

    const see = (mesh: Mesh, primitive: GpuPrimitive) =>
      (mesh.opacity < 1 || primitive.source.material.blend) as boolean;
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    this.drawWhere(meshes, (mesh, primitive) => !see(mesh, primitive));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    this.drawWhere(meshes, see);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  private drawWhere(meshes: readonly Mesh[], keep: (mesh: Mesh, primitive: GpuPrimitive) => boolean): void {
    const { gl } = this;
    for (const mesh of meshes) {
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      const tint = colorOf(mesh.color);
      for (const primitive of this.assets.get(mesh.asset) ?? []) {
        if (!keep(mesh, primitive)) {
          continue;
        }
        const { material } = primitive.source;
        const world = multiply(placed, primitive.transform);
        gl.uniformMatrix4fv(this.uniforms.uModel, false, world);
        gl.uniformMatrix3fv(this.uniforms.uNormal, false, normalMatrix(world));
        const [r, g, b] = tint ?? material.baseColor;
        gl.uniform4f(this.uniforms.uBase, r, g, b, material.baseColor[3] * mesh.opacity);
        gl.uniform1f(this.uniforms.uMetallic, mesh.metallic ?? material.metallic);
        gl.uniform1f(this.uniforms.uRoughness, mesh.roughness ?? material.roughness);
        gl.uniform1i(this.uniforms.uHasTexture, primitive.texture ? 1 : 0);
        gl.bindTexture(gl.TEXTURE_2D, primitive.texture ?? null);
        gl.bindVertexArray(primitive.vao);
        if (primitive.indexType === undefined) {
          gl.drawArrays(gl.TRIANGLES, 0, primitive.count);
        } else {
          gl.drawElements(gl.TRIANGLES, primitive.count, primitive.indexType, 0);
        }
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
    gl.deleteProgram(this.program);
  }
}
