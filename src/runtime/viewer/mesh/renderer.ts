import { DEFAULT_LIGHT, type Mesh, type Vec3 } from '../../../model/mesh';
import {
  type Box,
  boxCenter,
  boxCorner,
  boxDiagonal,
  type Camera,
  emptyBox,
  growBox,
  project,
  toWindow,
} from './camera';
import type { MaterialMapName, MeshAsset, MeshPrimitive } from './glb';
import { colorOf, type Lighting, lightingOf } from './lighting';
import {
  identity,
  lookAt,
  type Mat4,
  modelMatrix,
  multiply,
  normalMatrix,
  orthographic,
  transformPoint,
  windowMatrix,
} from './matrix';
import {
  DEPTH_FRAGMENT,
  FRAGMENT,
  GROUND_FRAGMENT,
  PLANE_FRAGMENT,
  PLANE_VERTEX,
  PROBE_FRAGMENT,
  VERTEX,
} from './shaderSources';

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

interface GpuPrimitive {
  vao: WebGLVertexArrayObject;
  buffers: WebGLBuffer[];
  count: number;
  indexType?: number;
  transform: Mat4;
  source: MeshPrimitive;
  bounds: Box;
  textures: Partial<Record<MaterialMapName, WebGLTexture>>;
}

// One part of one mesh at its place in the world.
interface Instance {
  mesh: Mesh;
  primitive: GpuPrimitive;
  world: Mat4;
}

interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const WORLD_UP: Vec3 = [0, 1, 0];
const SHADOW_SIZE = 2048;
const OCCLUSION_MARGIN = 0.004;
// Unit 1 holds the shadow map.
const MAP_SLOTS: ReadonlyArray<{ name: MaterialMapName; unit: number; has: string; sampler: string }> = [
  { name: 'base', unit: 0, has: 'uHasTexture', sampler: 'uTexture' },
  { name: 'normal', unit: 2, has: 'uHasNormal', sampler: 'uNormalMap' },
  { name: 'surface', unit: 3, has: 'uHasSurface', sampler: 'uSurfaceMap' },
  { name: 'occlusion', unit: 4, has: 'uHasOcclusion', sampler: 'uOcclusionMap' },
  { name: 'emissive', unit: 5, has: 'uHasEmissive', sampler: 'uEmissiveMap' },
];
const MAP_UNIFORMS = MAP_SLOTS.filter(slot => slot.name !== 'base').flatMap(slot => [slot.has, slot.sampler]);
const COLOR_MAPS: ReadonlySet<MaterialMapName> = new Set(['base', 'emissive']);
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

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

function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  beforeLink?: (program: WebGLProgram) => void,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('WebGL2 could not make a program');
  }
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  beforeLink?.(program);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL2 program: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function link(gl: WebGL2RenderingContext, fragmentSource: string, names: readonly string[]): Program {
  const program = linkProgram(gl, VERTEX, fragmentSource);
  return { program, uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) };
}

function requireObject<T>(value: T | null, what: string): T {
  if (value === null) {
    throw new Error(`WebGL2 could not make a ${what}`);
  }
  return value;
}

// Draws meshes with WebGL2. It knows nothing of SFL or SVG: it gets assets, and what the document says about each mesh.
export class MeshRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly main: Program;
  private readonly depth: Program;
  private readonly probing: Program;
  private readonly ground: Program;
  private readonly planePrograms = new Map<string, WebGLProgram>();
  private readonly mvpLocations = new Map<WebGLProgram, WebGLUniformLocation | null>();
  private readonly planeTextures = new Set<WebGLTexture>();
  private readonly picture: WebGLProgram;
  private readonly pictureSampler: WebGLUniformLocation | null;
  private readonly planeQuad: WebGLVertexArrayObject;
  readonly planeBuffer: WebGLBuffer;
  private readonly assets = new Map<string, GpuPrimitive[]>();
  private readonly shadowMap: WebGLTexture | null;
  private readonly shadowBuffer: WebGLFramebuffer | null;
  private readonly groundQuad: WebGLVertexArrayObject | null;
  private readonly groundBuffer: WebGLBuffer | null;
  private probeBuffer: WebGLFramebuffer | null = null;
  private probeColor: WebGLTexture | null = null;
  private probeDepth: WebGLRenderbuffer | null = null;
  private probeSize = '';
  // What the shadow map shows now, so that it is drawn again only when something that casts a shadow has moved.
  private shadowKey = '';
  private lightMatrix: Mat4 | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const common = ['uModel', 'uViewProjection', 'uNormal', 'uLight'];
    this.main = link(gl, FRAGMENT, [
      ...common,
      'uShadow',
      'uShadows',
      'uKey',
      'uSun',
      'uGlare',
      'uSky',
      'uFloor',
      'uFill',
      'uBase',
      'uMetallic',
      'uRoughness',
      'uEye',
      'uHasTexture',
      'uTexture',
      ...MAP_UNIFORMS,
      'uNormalScale',
      'uOcclusionStrength',
      'uEmissive',
    ]);
    this.depth = link(gl, DEPTH_FRAGMENT, common);
    this.probing = link(gl, PROBE_FRAGMENT, [...common, 'uEye', 'uRange', 'uId']);
    this.ground = link(gl, GROUND_FRAGMENT, [...common, 'uShadow', 'uCenter', 'uFade', 'uStrength', 'uGrid', 'uCell', 'uReach', 'uStage']);

    this.picture = this.linkPlane(PLANE_FRAGMENT);
    this.pictureSampler = gl.getUniformLocation(this.picture, 'uPicture');
    this.planeQuad = requireObject(gl.createVertexArray(), 'vertex array');
    this.planeBuffer = requireObject(gl.createBuffer(), 'buffer');
    gl.bindVertexArray(this.planeQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.planeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
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

  // The shaders of the 2D drawing are written for this type of context, and they run in a newer one as they are.
  get shaderContext(): WebGLRenderingContext {
    return this.gl as unknown as WebGLRenderingContext;
  }

  // A program for a surface, kept for all that use the same one. It is written in the older form of the language, as shaders are.
  linkPlane(fragmentSource: string): WebGLProgram {
    const known = this.planePrograms.get(fragmentSource);
    if (known) {
      return known;
    }
    const { gl } = this;
    const program = linkProgram(gl, PLANE_VERTEX, fragmentSource, made => gl.bindAttribLocation(made, 0, 'aPosition'));
    this.planePrograms.set(fragmentSource, program);
    this.mvpLocations.set(program, gl.getUniformLocation(program, 'uMvp'));
    return program;
  }

  // A picture for a surface, with smaller copies, so that small text does not flicker.
  planeTexture(source: TexImageSource): WebGLTexture {
    const { gl } = this;
    const texture = requireObject(gl.createTexture(), 'texture');
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
    this.planeTextures.add(texture);
    return texture;
  }

  deleteTexture(texture: WebGLTexture): void {
    this.planeTextures.delete(texture);
    this.gl.deleteTexture(texture);
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

  setTexture(asset: string, primitiveIndex: number, name: MaterialMapName, image: ImageBitmap): void {
    const primitive = this.assets.get(asset)?.[primitiveIndex];
    if (!primitive) {
      return;
    }
    const { gl } = this;
    const sampler = primitive.source.material.maps[name]?.sampler;
    const texture = requireObject(gl.createTexture(), 'texture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      COLOR_MAPS.has(name) ? gl.SRGB8_ALPHA8 : gl.RGBA8,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler?.magFilter ?? gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampler?.minFilter ?? gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, sampler?.wrapS ?? gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, sampler?.wrapT ?? gl.REPEAT);
    primitive.textures[name] = texture;
  }

  private upload(source: MeshPrimitive): GpuPrimitive {
    const { gl } = this;
    const vao = requireObject(gl.createVertexArray(), 'vertex array');
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
    const bounds = emptyBox();
    const { positions } = source;
    for (let i = 0; i < positions.length; i += 3) {
      growBox(bounds, [positions[i], positions[i + 1], positions[i + 2]]);
    }
    return {
      vao,
      buffers: buffers.filter((buffer): buffer is WebGLBuffer => buffer !== null),
      count: source.indices ? source.indices.length : source.positions.length / 3,
      indexType,
      transform: source.transform,
      source,
      bounds,
      textures: {},
    };
  }

  private instances(meshes: readonly Mesh[]): Instance[] {
    return meshes.flatMap(mesh => {
      const placed = modelMatrix(mesh.position, mesh.rotation, mesh.scale);
      return (this.assets.get(mesh.asset) ?? []).map(primitive => ({
        mesh,
        primitive,
        world: multiply(placed, primitive.transform),
      }));
    });
  }

  private boxOf(instances: readonly Instance[], planes: readonly Plane[]): Box | undefined {
    const box = emptyBox();
    for (const { primitive, world } of instances) {
      for (let index = 0; index < 8; index++) {
        growBox(box, transformPoint(world, boxCorner(primitive.bounds, index)));
      }
    }
    for (const plane of planes) {
      for (const corner of [
        [-1, -1, 0],
        [1, -1, 0],
        [-1, 1, 0],
        [1, 1, 0],
      ]) {
        growBox(box, transformPoint(plane.matrix, corner));
      }
    }
    return Number.isFinite(box.min[0]) ? box : undefined;
  }

  // The box around what stands on the stage, from the corners of the box of each part, so it costs the same for a million triangles.
  box(meshes: readonly Mesh[], planes: readonly Plane[] = []): Box | undefined {
    return this.boxOf(this.instances(meshes), planes);
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

  // Whether the box of a part, as the canvas sees it, can cover a point of the canvas.
  private mayCover({ primitive, world }: Instance, camera: Camera, x: number, y: number): boolean {
    const m = camera.viewProjection;
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let index = 0; index < 8; index++) {
      const [px, py, pz] = transformPoint(world, boxCorner(primitive.bounds, index));
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

  // Draws only the one pixel under a point of the canvas, and only the parts that can be there.
  private probe(
    meshes: readonly Mesh[],
    camera: Camera,
    x: number,
    y: number,
  ): { id: string; distance: number } | null {
    const instances = this.instances(meshes).filter(instance => this.mayCover(instance, camera, x, y));
    if (instances.length === 0) {
      return null;
    }
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
    instances.forEach(({ primitive, world }, index) => {
      const id = index + 1;
      gl.uniform2f(uniforms.uId, (id >> 8) / 255, (id & 255) / 255);
      gl.uniformMatrix4fv(uniforms.uModel, false, world);
      this.drawPrimitive(primitive);
    });
    const pixel = new Uint8Array(4);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const found = instances[((pixel[0] << 8) | pixel[1]) - 1];
    return found ? { id: found.mesh.id, distance: (((pixel[2] << 8) | pixel[3]) / 65535) * camera.range } : null;
  }

  // Which mesh lies under a point of the canvas.
  pick(meshes: readonly Mesh[], camera: Camera, x: number, y: number): string | null {
    return this.probe(meshes, camera, x, y)?.id ?? null;
  }

  // How far away the mesh under a point of the canvas is.
  meshDistance(meshes: readonly Mesh[], camera: Camera, x: number, y: number): number | undefined {
    return this.probe(meshes, camera, x, y)?.distance;
  }

  // Whether a mesh lies between the camera and a point of the world.
  occluded(meshes: readonly Mesh[], camera: Camera, point: readonly number[]): boolean {
    const projected = project(camera, point);
    const onCanvas = projected && toWindow(camera, projected[0], projected[1]);
    if (!onCanvas) {
      return false;
    }
    const hit = this.probe(meshes, camera, onCanvas[0], onCanvas[1]);
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

  // The scene seen from the light, as a picture of how far away everything is. It stays as long as nothing that casts a shadow has moved.
  private shadowMatrix(instances: readonly Instance[], planes: readonly Plane[], box: Box, direction: Vec3): Mat4 {
    const casting = instances.filter(({ mesh }) => mesh.opacity >= 0.5);
    const key = [
      ...casting.map(({ world, primitive }) => `${primitive.count}:${world.join()}`),
      ...planes.map(plane => plane.matrix.join()),
      box.min.join(),
      box.max.join(),
      direction.join(),
    ].join('|');
    if (key === this.shadowKey && this.lightMatrix) {
      return this.lightMatrix;
    }
    this.shadowKey = key;
    const { gl } = this;
    const center = boxCenter(box);
    const radius = Math.max(boxDiagonal(box) / 2, 1e-3) * 1.6;
    const eye = center.map((value, axis) => value + direction[axis] * radius * 2) as Vec3;
    const lightMatrix = multiply(orthographic(radius, 0.01, radius * 4), lookAt(eye, center, WORLD_UP));
    const { program, uniforms } = this.depth;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, lightMatrix);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 4);
    for (const { primitive, world } of casting) {
      gl.uniformMatrix4fv(uniforms.uModel, false, world);
      this.drawPrimitive(primitive);
    }
    gl.bindVertexArray(this.planeQuad);
    for (const plane of planes) {
      gl.uniformMatrix4fv(uniforms.uModel, false, plane.matrix);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.lightMatrix = lightMatrix;
    return lightMatrix;
  }

  draw(
    meshes: readonly Mesh[],
    camera: Camera | undefined,
    options: { shadows?: boolean; planes?: readonly Plane[]; lighting?: Lighting; grid?: boolean } = {},
  ): void {
    const planes = options.planes ?? [];
    const lighting = options.lighting ?? lightingOf(DEFAULT_LIGHT);
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const instances = this.instances(meshes);
    const box = this.boxOf(instances, planes);
    if (!camera || !box) {
      return;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const lightMatrix = options.shadows ? this.shadowMatrix(instances, planes, box, lighting.direction) : identity();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);

    const { program, uniforms } = this.main;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    for (const { unit, sampler } of MAP_SLOTS) {
      gl.uniform1i(uniforms[sampler], unit);
    }
    gl.uniform1i(uniforms.uShadow, 1);
    gl.uniform1f(uniforms.uShadows, options.shadows ? 1 : 0);
    gl.uniform3fv(uniforms.uKey, lighting.direction);
    gl.uniform3fv(uniforms.uSun, lighting.sun);
    gl.uniform3fv(uniforms.uGlare, lighting.glare);
    gl.uniform3fv(uniforms.uSky, lighting.sky);
    gl.uniform3fv(uniforms.uFloor, lighting.floor);
    gl.uniform1f(uniforms.uFill, lighting.fill);
    gl.activeTexture(gl.TEXTURE0);

    const seeThrough = ({ mesh, primitive }: Instance) => mesh.opacity < 1 || primitive.source.material.blend;
    this.drawInstances(instances.filter(instance => !seeThrough(instance)));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (options.shadows || options.grid) {
      this.drawGround(camera, lightMatrix, box, options.shadows ? lighting.groundShadow : 0, options.grid ?? false);
    }
    this.drawPlanes(camera, planes);
    gl.useProgram(program);
    gl.depthMask(false);
    this.drawInstances(instances.filter(seeThrough));
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
        const isShader = 'rect' in layer;
        const program = isShader ? layer.program : this.picture;
        let matrix = plane.matrix;
        if (isShader) {
          const [left, top, width, height] = layer.rect;
          matrix = multiply(matrix, windowMatrix(width, height, left * 2 + width - 1, 1 - top * 2 - height));
        }
        gl.useProgram(program);
        gl.uniformMatrix4fv(this.mvpLocations.get(program) ?? null, false, multiply(camera.viewProjection, matrix));
        if (isShader) {
          layer.upload();
        } else {
          gl.bindTexture(gl.TEXTURE_2D, layer.texture);
          gl.uniform1i(this.pictureSampler, 0);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
  }

  private drawGround(camera: Camera, lightMatrix: Mat4, box: Box, strength: number, grid: boolean): void {
    const { gl } = this;
    const { program, uniforms } = this.ground;
    const middle = boxCenter(box);
    const center: Vec3 = [middle[0], box.min[1], middle[2]];
    const diagonal = Math.max(boxDiagonal(box), 1e-3);
    const fade = diagonal * 1.4;
    // The grid reaches further than the shadow and fades out, so it seems to go on. A cell is a power of ten that suits the size of the scene.
    const reach = grid ? diagonal * 3 : fade;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix(center, [0, 0, 0], [reach, 1, reach]));
    gl.uniform1i(uniforms.uShadow, 1);
    gl.uniform3fv(uniforms.uCenter, center);
    gl.uniform1f(uniforms.uFade, fade);
    gl.uniform1f(uniforms.uStrength, strength);
    gl.uniform1f(uniforms.uGrid, grid ? 1 : 0);
    gl.uniform1f(uniforms.uCell, Math.pow(10, Math.floor(Math.log10(diagonal / 4))));
    gl.uniform1f(uniforms.uReach, reach);
    gl.uniformMatrix4fv(uniforms.uStage, false, camera.stage);
    gl.depthMask(false);
    gl.bindVertexArray(this.groundQuad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.depthMask(true);
  }

  private drawInstances(instances: readonly Instance[]): void {
    const { gl } = this;
    const { uniforms } = this.main;
    for (const { mesh, primitive, world } of instances) {
      const { material } = primitive.source;
      gl.uniformMatrix4fv(uniforms.uModel, false, world);
      gl.uniformMatrix3fv(uniforms.uNormal, false, normalMatrix(world));
      const [r, g, b] = colorOf(mesh.color) ?? material.baseColor;
      gl.uniform4f(uniforms.uBase, r, g, b, material.baseColor[3] * mesh.opacity);
      gl.uniform1f(uniforms.uMetallic, mesh.metallic ?? material.metallic);
      gl.uniform1f(uniforms.uRoughness, mesh.roughness ?? material.roughness);
      gl.uniform1f(uniforms.uNormalScale, material.normalScale);
      gl.uniform1f(uniforms.uOcclusionStrength, material.occlusionStrength);
      gl.uniform3fv(uniforms.uEmissive, material.emissive);
      for (const { name, unit, has } of MAP_SLOTS) {
        // What the document says about a surface counts over the picture of the file.
        const overruled = name === 'surface' && (mesh.metallic !== undefined || mesh.roughness !== undefined);
        const texture = overruled ? undefined : primitive.textures[name];
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture ?? null);
        gl.uniform1i(uniforms[has], texture ? 1 : 0);
      }
      gl.activeTexture(gl.TEXTURE0);
      this.drawPrimitive(primitive);
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
        for (const texture of Object.values(primitive.textures)) {
          gl.deleteTexture(texture);
        }
      }
    }
    this.assets.clear();
    this.releaseProbe();
    for (const texture of this.planeTextures) {
      gl.deleteTexture(texture);
    }
    this.planeTextures.clear();
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
