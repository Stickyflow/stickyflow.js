import { DEFAULT_LIGHT, type Mesh, type MeshGround, type Vec3 } from '../../../model/mesh';
import { Accumulation, halton } from './accumulation';
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
import type { EnvironmentImage, SkyLight } from './environment';
import { ENVIRONMENT_UNIFORMS, EnvironmentMap } from './environmentMap';
import { link, linkProgram, type Program, QUAD, requireObject } from './gl';
import type { MaterialMapName, MeshAsset, MeshPrimitive } from './glb';
import { colorOf, type Lighting, lightingOf } from './lighting';
import { identity, type Mat4, modelMatrix, multiply, normalMatrix, transformPoint, windowMatrix } from './matrix';
import { MeshProbe } from './meshProbe';
import { SCREEN_OCCLUSION_UNIFORMS, ScreenOcclusion } from './screenOcclusion';
import { GROUND_FRAGMENT } from './shaders/ground';
import { FRAGMENT } from './shaders/mesh';
import { PLANE_FRAGMENT, PLANE_VERTEX } from './shaders/plane';
import { type Caster, ENVIRONMENT_SHADOW, ShadowMap, SUN_SHADOW, shadowUniforms } from './shadowMap';
import { PathTracer } from './trace/pathTracer';
import type { TraceMapName, TracePart } from './trace/sceneData';

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
// How large the sun looks, in degrees, in a Scene with an environment.
const DEFAULT_SOFTNESS = 1.5;
const PLAIN_GROUND_SHADOW = 0.32;
// What a ground without a color throws light back with: about as much as a page does.
const PAGE_COLOR: Vec3 = [0.8, 0.8, 0.8];
// How much the light is scaled before the filmic curve. An environment is lit evenly, so it can be brighter.
const PLAIN_EXPOSURE = 0.45;
const ENVIRONMENT_EXPOSURE = 0.7;
// A still picture waits this long after the last change, then adds up this many frames.
const SETTLE_MS = 150;
const STILL_FRAMES = 192;
// Before this many frames the sum is not shown yet, as single frames have hard edges and one light each.
const STILL_SHOWN_FROM = 8;
const SHADOW_NAMES = [
  ...shadowUniforms(SUN_SHADOW),
  ...shadowUniforms(ENVIRONMENT_SHADOW),
  'uEnvMode',
  'uEnvDirection',
  'uEnvLight',
  'uEnvLightColor',
  'uEnvGround',
  'uStill',
];
// Two numbers that fill a square evenly, however many are taken: the steps of the R2 sequence.
const R2 = [0.7548776662466927, 0.5698402909980532];

// The light of the environment that a frame shows: none, the one large light of a moving picture, or one light of a still one.
type EnvironmentLight =
  | { mode: 0 }
  | { mode: 1; direction: Vec3; softness: number }
  | { mode: 2; direction: Vec3; color: Vec3; ground: number };

export interface DrawOptions {
  shadows?: boolean;
  planes?: readonly Plane[];
  lighting?: Lighting;
  grid?: boolean;
  environmentTurn?: number;
  // Brighter or darker than usual, in stops.
  exposure?: number;
  ground?: MeshGround;
  // The picture may be refined over several frames, as nothing in it moves.
  still?: boolean;
}

// What a frame of a still picture changes: where the camera stands within a pixel, and which light of the environment it shows.
interface StillFrame {
  index: number;
  shift: [number, number];
  light: SkyLight | null;
}

// Draws meshes with WebGL2. It knows nothing of SFL or SVG: it gets assets, and what the document says about each mesh.
export class MeshRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly main: Program;
  private readonly probe: MeshProbe;
  private readonly ground: Program;
  private readonly planePrograms = new Map<string, WebGLProgram>();
  private readonly mvpLocations = new Map<WebGLProgram, WebGLUniformLocation | null>();
  private readonly planeTextures = new Set<WebGLTexture>();
  private readonly picture: WebGLProgram;
  private readonly pictureSampler: WebGLUniformLocation | null;
  private readonly pictureStill: WebGLUniformLocation | null;
  private readonly planeQuad: WebGLVertexArrayObject;
  readonly planeBuffer: WebGLBuffer;
  private readonly assets = new Map<string, GpuPrimitive[]>();
  private readonly shadows: ShadowMap;
  private readonly environment: EnvironmentMap;
  private readonly occlusion: ScreenOcclusion;
  private readonly environmentShadows: ShadowMap;
  private readonly accumulation: Accumulation;
  private readonly tracer: PathTracer;
  private readonly textureSizes = new Map<WebGLTexture, [number, number]>();
  // Counts what changes the look of the meshes besides the document: pictures that arrive and environments.
  private generation = 0;
  private stillKey = '';
  private settled = 0;
  private readonly groundQuad: WebGLVertexArrayObject | null;
  private readonly groundBuffer: WebGLBuffer | null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const common = ['uModel', 'uViewProjection', 'uNormal', 'uLight'];
    this.main = link(gl, FRAGMENT, [
      ...common,
      ...SHADOW_NAMES,
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
      ...ENVIRONMENT_UNIFORMS,
      ...SCREEN_OCCLUSION_UNIFORMS,
      'uExposure',
      'uMirror',
    ]);
    this.ground = link(gl, GROUND_FRAGMENT, [
      ...common,
      ...SHADOW_NAMES,
      'uDarkness',
      'uCenter',
      'uFade',
      'uStrength',
      'uGrid',
      'uCell',
      'uReach',
      'uStage',
      'uBasePass',
      'uGroundColor',
      ...SCREEN_OCCLUSION_UNIFORMS,
    ]);

    this.picture = this.linkPlane(PLANE_FRAGMENT);
    this.pictureSampler = gl.getUniformLocation(this.picture, 'uPicture');
    this.pictureStill = gl.getUniformLocation(this.picture, 'uStill');
    this.planeQuad = requireObject(gl.createVertexArray(), 'vertex array');
    this.planeBuffer = requireObject(gl.createBuffer(), 'buffer');
    gl.bindVertexArray(this.planeQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.planeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.groundQuad = gl.createVertexArray();
    this.groundBuffer = gl.createBuffer();
    gl.bindVertexArray(this.groundQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.probe = new MeshProbe(gl);
    this.shadows = new ShadowMap(gl);
    this.environment = new EnvironmentMap(gl, this.planeQuad);
    this.occlusion = new ScreenOcclusion(gl, this.planeQuad, this.groundQuad);
    this.environmentShadows = new ShadowMap(gl, ENVIRONMENT_SHADOW);
    this.accumulation = new Accumulation(gl, this.planeQuad);
    this.tracer = new PathTracer(gl, this.planeQuad);
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
    this.generation++;
    return texture;
  }

  deleteTexture(texture: WebGLTexture): void {
    this.planeTextures.delete(texture);
    this.gl.deleteTexture(texture);
  }

  // Lights the meshes with a picture of the world around them, or with the sun and sky alone when there is none.
  setEnvironment(image: EnvironmentImage | null): void {
    this.environment.set(image);
    this.generation++;
  }

  hasAsset(asset: string): boolean {
    return this.assets.has(asset);
  }

  addAsset(asset: string, mesh: MeshAsset): void {
    this.generation++;
    this.assets.set(
      asset,
      mesh.primitives.map(primitive => this.upload(primitive)),
    );
  }

  setTexture(asset: string, primitiveIndex: number, name: MaterialMapName, image: ImageBitmap): void {
    this.generation++;
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
    this.textureSizes.set(texture, [image.width, image.height]);
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

  // Where a scene stands. The ground stays where the meshes stand when nothing has lifted them, and the box reaches down to it,
  // so the shadows of what is lifted still fall on it. A grid and a ground with a color reach further than the shadows do.
  private standing(
    instances: readonly Instance[],
    measured: Box,
    options: DrawOptions,
  ): { floor: number; wide: boolean; box: Box } {
    const floor = options.ground?.height ?? this.floorOf(instances) ?? measured.min[1];
    return {
      floor,
      wide: (options.grid ?? false) || Boolean(options.ground?.color),
      box: { min: [measured.min[0], Math.min(measured.min[1], floor), measured.min[2]], max: measured.max },
    };
  }

  // The height of the ground: the lowest point of the meshes as they stand at the height the files give them, before the document
  // or a drag lifts or lowers them. So a mesh that is lifted leaves the ground, and the ground does not follow it.
  private floorOf(instances: readonly Instance[]): number | undefined {
    let floor = Infinity;
    for (const { mesh, primitive, world } of instances) {
      for (let index = 0; index < 8; index++) {
        floor = Math.min(floor, transformPoint(world, boxCorner(primitive.bounds, index))[1] - mesh.position[1]);
      }
    }
    return Number.isFinite(floor) ? floor : undefined;
  }

  // The box around what stands on the stage, from the corners of the box of each part, so it costs the same for a million triangles.
  box(meshes: readonly Mesh[], planes: readonly Plane[] = []): Box | undefined {
    return this.boxOf(this.instances(meshes), planes);
  }

  // What lies under a point of the canvas, and how far away.
  private find(meshes: readonly Mesh[], camera: Camera, x: number, y: number): { id: string; distance: number } | null {
    const targets = this.instances(meshes).map(({ mesh, primitive, world }) => ({
      id: mesh.id,
      bounds: primitive.bounds,
      world,
      draw: () => this.drawPrimitive(primitive),
    }));
    return this.probe.find(targets, camera, x, y);
  }

  // Which mesh lies under a point of the canvas.
  pick(meshes: readonly Mesh[], camera: Camera, x: number, y: number): string | null {
    return this.find(meshes, camera, x, y)?.id ?? null;
  }

  // How far away the mesh under a point of the canvas is.
  meshDistance(meshes: readonly Mesh[], camera: Camera, x: number, y: number): number | undefined {
    return this.find(meshes, camera, x, y)?.distance;
  }

  // Whether a mesh lies between the camera and a point of the world.
  occluded(meshes: readonly Mesh[], camera: Camera, point: readonly number[]): boolean {
    const projected = project(camera, point);
    const onCanvas = projected && toWindow(camera, projected[0], projected[1]);
    if (!onCanvas) {
      return false;
    }
    const hit = this.find(meshes, camera, onCanvas[0], onCanvas[1]);
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

  // What casts a shadow: the meshes that are not mostly see-through, and the surfaces.
  private casters(instances: readonly Instance[], planes: readonly Plane[]): Caster[] {
    const { gl } = this;
    return [
      ...instances
        .filter(({ mesh }) => mesh.opacity >= 0.5)
        .map(({ world, primitive }) => ({
          key: `${primitive.count}:${world.join()}`,
          world,
          draw: () => this.drawPrimitive(primitive),
        })),
      ...planes.map(plane => ({
        key: plane.matrix.join(),
        world: plane.matrix,
        draw: () => {
          gl.bindVertexArray(this.planeQuad);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        },
      })),
    ];
  }

  // Draws the meshes. A still picture is refined frame by frame once nothing has changed for a moment: the result says whether
  // another frame is wanted.
  draw(meshes: readonly Mesh[], camera: Camera | undefined, options: DrawOptions = {}): boolean {
    const still = camera && options.still && this.environment.present && this.accumulation.possible;
    if (!camera || !still) {
      this.stillKey = '';
      this.drawFrame(meshes, camera, options, null, null);
      return false;
    }
    const now = performance.now();
    const key = this.viewKey(meshes, camera, options);
    if (key !== this.stillKey) {
      this.stillKey = key;
      this.settled = now + SETTLE_MS;
      this.accumulation.reset();
      this.drawFrame(meshes, camera, options, null, null);
      return true;
    }
    if (now < this.settled) {
      return true;
    }
    if (this.accumulation.count >= STILL_FRAMES) {
      return false;
    }
    const target = this.accumulation.begin();
    if (!target) {
      return false;
    }
    const index = this.accumulation.count + 1;
    const { gl } = this;
    const frame: StillFrame = {
      index,
      shift: [
        ((halton(index, 2) - 0.5) * 2) / gl.drawingBufferWidth,
        ((halton(index, 3) - 0.5) * 2) / gl.drawingBufferHeight,
      ],
      light: this.environment.pickLight(
        [(0.5 + index * R2[0]) % 1, (0.5 + index * R2[1]) % 1, halton(index, 5), halton(index, 7)],
        options.environmentTurn ?? 0,
      ),
    };
    // A scene of meshes is traced, path by path. One with a Canvas is drawn as while it moves, light by light.
    const traced = this.traceFrame(meshes, camera, options, target, frame);
    const under = traced ? traced.under : this.drawFrame(meshes, camera, options, target, frame);
    this.accumulation.add(index >= STILL_SHOWN_FROM, under);
    return this.accumulation.count < STILL_FRAMES;
  }

  // All that decides how a still picture looks, so a change starts it over.
  private viewKey(meshes: readonly Mesh[], camera: Camera, options: DrawOptions): string {
    const { gl } = this;
    return [
      camera.viewProjection.join(),
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      JSON.stringify(meshes),
      JSON.stringify(options.lighting ?? null),
      (options.planes ?? []).map(plane => plane.matrix.join()).join(';'),
      options.shadows,
      options.grid,
      options.environmentTurn,
      options.exposure,
      JSON.stringify(options.ground ?? null),
      this.generation,
    ].join('|');
  }

  // One frame: on the canvas, or into a target of a still picture with the camera shifted within a pixel and one light of the
  // environment. A ground with a color is not part of such a frame, as shadows darken it the way they darken the page, not the
  // way they take light away: what comes back draws it, for under the frames once they are added up.
  private drawFrame(
    meshes: readonly Mesh[],
    camera: Camera | undefined,
    options: DrawOptions,
    target: WebGLFramebuffer | null,
    still: StillFrame | null,
  ): (() => void) | null {
    const planes = options.planes ?? [];
    const lighting = options.lighting ?? lightingOf(DEFAULT_LIGHT);
    const { gl } = this;
    if (!target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    const instances = this.instances(meshes);
    const measured = this.boxOf(instances, planes);
    if (!camera || !measured) {
      return null;
    }
    const plain = camera;
    const { floor, wide, box } = this.standing(instances, measured, options);
    if (still) {
      const shift = windowMatrix(1, 1, still.shift[0], still.shift[1]);
      camera = { ...camera, viewProjection: multiply(shift, camera.viewProjection) };
    }
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const casters = this.casters(instances, planes);
    const lightMatrix = options.shadows ? this.shadows.update(casters, box, lighting.direction) : identity();
    // While the picture moves, one large light stands for the environment, so its shadow already lies where the still picture puts it.
    const main = still ? null : this.environment.mainLight(options.environmentTurn ?? 0);
    const environmentLight: EnvironmentLight = still?.light
      ? { mode: 2, direction: still.light.direction, color: still.light.color, ground: still.light.ground }
      : main
        ? { mode: 1, direction: main.direction, softness: main.size }
        : { mode: 0 };
    const environmentMatrix =
      environmentLight.mode === 0
        ? identity()
        : this.environmentShadows.update(casters, box, environmentLight.direction);
    const seeThrough = ({ mesh, primitive }: Instance) => mesh.opacity < 1 || primitive.source.material.blend;
    const solids = instances
      .filter(instance => !seeThrough(instance))
      .map(({ world, primitive }) => ({ world, draw: () => this.drawPrimitive(primitive) }));
    // The occlusion comes with an environment, as without one the light of the sky is too plain to need it.
    const occlusion =
      this.environment.present &&
      this.occlusion.draw(
        camera,
        solids,
        boxDiagonal(box) * 0.08,
        this.groundOf(box, floor, wide).matrix,
        still?.index ?? 0,
      );
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    // With an environment the sun is a disc, not a point, unless the document says how large it is.
    const softness = lighting.softness ?? (this.environment.present ? DEFAULT_SOFTNESS : 0);

    const { program, uniforms } = this.main;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    for (const { unit, sampler } of MAP_SLOTS) {
      gl.uniform1i(uniforms[sampler], unit);
    }
    this.shadows.bind(uniforms, softness);
    this.bindEnvironmentShadow(uniforms, environmentLight, environmentMatrix, lighting.ambient);
    gl.uniform1i(uniforms.uStill, still ? 1 : 0);
    gl.uniform1f(uniforms.uShadows, options.shadows ? 1 : 0);
    gl.uniform3fv(uniforms.uKey, lighting.direction);
    gl.uniform3fv(uniforms.uSun, lighting.sun);
    gl.uniform3fv(uniforms.uGlare, lighting.glare);
    gl.uniform3fv(uniforms.uSky, lighting.sky);
    gl.uniform3fv(uniforms.uFloor, lighting.floor);
    gl.uniform1f(uniforms.uFill, this.environment.present ? 0 : lighting.fill);
    const exposure = this.environment.present ? ENVIRONMENT_EXPOSURE : PLAIN_EXPOSURE;
    gl.uniform1f(uniforms.uExposure, exposure * 2 ** (options.exposure ?? 0));
    this.environment.bind(uniforms, options.environmentTurn ?? 0, lighting.ambient);
    this.occlusion.bind(uniforms, occlusion);

    const opaque = instances.filter(instance => !seeThrough(instance));
    const groundColor = colorOf(options.ground?.color)?.map(value => value ** (1 / 2.2));
    const reflection = options.ground?.reflection ?? 0;
    // Sets the program of the ground up for one of its two passes: the ground itself, or the shadows and the grid on it.
    const prepareGround = () => {
      const shadow = {
        strength: options.shadows ? lighting.groundShadow : 0,
        darkness: this.groundDarkness(lighting),
        softness,
      };
      this.drawGround(camera, lightMatrix, box, floor, shadow, options.grid ?? false, wide, occlusion);
      this.bindEnvironmentShadow(this.ground.uniforms, environmentLight, environmentMatrix, lighting.ambient);
      gl.uniform1i(this.ground.uniforms.uStill, still ? 1 : 0);
      gl.uniform1i(this.ground.uniforms.uBasePass, 0);
    };
    if (groundColor && !still) {
      this.drawGroundBase(camera, box, floor, wide, groundColor);
      gl.useProgram(program);
    }
    if (reflection > 0) {
      // The rougher the ground, the nearer to it the reflection ends.
      const roughness = options.ground?.roughness ?? 0;
      const reach = roughness > 0 ? boxDiagonal(box) * (0.08 + 0.9 * (1 - roughness) ** 2) : 1e9;
      this.drawReflection(opaque, floor, [reflection, reach], lightMatrix, environmentMatrix);
      this.occlusion.bind(uniforms, occlusion);
    }
    this.drawInstances(opaque);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (options.shadows || options.grid || occlusion || environmentLight.mode !== 0) {
      prepareGround();
      this.drawGroundQuad();
    }
    this.drawPlanes(camera, planes, still !== null);
    gl.useProgram(program);
    // What is seen through lies over what the occlusion was worked out for, so it takes none.
    this.occlusion.bind(uniforms, false);
    gl.depthMask(false);
    this.drawInstances(instances.filter(seeThrough));
    gl.depthMask(true);
    gl.bindVertexArray(null);
    return groundColor && still ? () => this.drawGroundBase(plain, box, floor, wide, groundColor) : null;
  }

  // A frame of a still picture by following paths of light: for a scene of meshes in an environment, which is all the tracer
  // knows. Null when the scene has a Canvas too, and it is drawn the other way.
  private traceFrame(
    meshes: readonly Mesh[],
    camera: Camera,
    options: DrawOptions,
    target: WebGLFramebuffer,
    still: StillFrame,
  ): { under: (() => void) | null } | null {
    const picture = this.environment.picture;
    const light = still.light;
    const instances = this.instances(meshes);
    const seeThrough = instances.some(({ mesh, primitive }) => mesh.opacity < 1 || primitive.source.material.blend);
    const measured = this.boxOf(instances, []);
    if (!picture || !light || !measured || (options.planes ?? []).length > 0 || !this.tracer.possible) {
      return null;
    }
    const { gl } = this;
    const { floor, wide, box } = this.standing(instances, measured, options);
    const lighting = options.lighting ?? lightingOf(DEFAULT_LIGHT);
    const key = `${this.generation}|${instances
      .map(({ mesh, primitive, world }) =>
        [primitive.count, world.join(), mesh.color, mesh.metallic, mesh.roughness, mesh.opacity].join(':'),
      )
      .join('|')}`;
    this.tracer.load(key, () => instances.map(instance => this.tracePart(instance)));
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.accumulation.takeGuides();
    const shift = windowMatrix(1, 1, still.shift[0], still.shift[1]);
    const ground = this.groundOf(box, floor, wide);
    const groundColor = colorOf(options.ground?.color);
    const softness = lighting.softness ?? DEFAULT_SOFTNESS;
    this.tracer.draw({
      camera: { ...camera, viewProjection: multiply(shift, camera.viewProjection) },
      seed: still.index,
      exposure: ENVIRONMENT_EXPOSURE * 2 ** (options.exposure ?? 0),
      lift: boxDiagonal(box) * 1e-4,
      seeThrough,
      environment: {
        ...picture,
        turn: options.environmentTurn ?? 0,
        strength: lighting.ambient,
        // A light is picked as often as it is bright, so its color holds all the light of the sky, over pi.
        total: (0.2126 * light.color[0] + 0.7152 * light.color[1] + 0.0722 * light.color[2]) * Math.PI,
        direction: light.direction,
        light: light.color.map(value => value * Math.PI * lighting.ambient) as Vec3,
      },
      sun: {
        direction: lighting.direction,
        light: lighting.sun,
        size: Math.tan((Math.max(0, softness) * Math.PI) / 360),
        shadows: options.shadows ?? false,
      },
      ground: {
        floor,
        reflection: options.ground?.reflection ?? 0,
        roughness: options.ground?.roughness ?? 0,
        color: groundColor ?? PAGE_COLOR,
        environmentShadow: light.ground,
        sunShadow: options.shadows ? lighting.groundShadow * this.groundDarkness(lighting) : 0,
        center: ground.center,
        fade: ground.fade,
      },
    });
    const shown = groundColor?.map(value => value ** (1 / 2.2));
    return { under: shown ? () => this.drawGroundBase(camera, box, floor, wide, shown) : null };
  }

  private tracePart({ mesh, primitive, world }: Instance): TracePart {
    const { source, textures } = primitive;
    const { material } = source;
    const [r, g, b] = colorOf(mesh.color) ?? material.baseColor;
    // What the document says about a surface counts over the picture of the file.
    const overruled = mesh.metallic !== undefined || mesh.roughness !== undefined;
    const maps: TracePart['maps'] = {};
    for (const name of ['base', 'emissive', 'surface', 'normal'] as TraceMapName[]) {
      const texture = name === 'surface' && overruled ? undefined : textures[name];
      const size = texture && this.textureSizes.get(texture);
      if (texture && size) {
        maps[name] = { texture, width: size[0], height: size[1] };
      }
    }
    return {
      world,
      positions: source.positions,
      normals: source.normals,
      uvs: source.uvs,
      indices: source.indices,
      // Only a material that is meant to be seen through is: the alpha of others means nothing.
      base: [r, g, b, mesh.opacity * (material.blend ? material.baseColor[3] : 1)],
      metallic: mesh.metallic ?? material.metallic,
      roughness: mesh.roughness ?? material.roughness,
      emissive: material.emissive,
      normalScale: material.normalScale,
      maps,
    };
  }

  // The ground itself, when it has a color: in the colors of the screen, under what it reflects and the shadows on it.
  private drawGroundBase(camera: Camera, box: Box, floor: number, wide: boolean, color: readonly number[]): void {
    const { gl } = this;
    const { uniforms } = this.ground;
    this.drawGround(camera, identity(), box, floor, { strength: 0, darkness: 0, softness: 0 }, false, wide, false);
    this.bindEnvironmentShadow(uniforms, { mode: 0 }, identity(), 0);
    gl.uniform1i(uniforms.uStill, 0);
    gl.uniform1i(uniforms.uBasePass, 1);
    gl.uniform3fv(uniforms.uGroundColor, color);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.drawGroundQuad();
    gl.disable(gl.BLEND);
  }

  // The layers of a surface lie in one plane, so each is pulled a little toward the camera over the one before.
  private drawPlanes(camera: Camera, planes: readonly Plane[], still: boolean): void {
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
          gl.uniform1i(this.pictureStill, still ? 1 : 0);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
  }

  // How dark a shadow on the page is. With an environment it is the share of the sun in the light a surface facing up gets, so it
  // matches the shadows on the meshes; without one it is a light grey.
  private groundDarkness(lighting: Lighting): number {
    if (!this.environment.present) {
      return PLAIN_GROUND_SHADOW;
    }
    const [r, g, b] = lighting.sun;
    const sun = ((0.2126 * r + 0.7152 * g + 0.0722 * b) * Math.max(0, lighting.direction[1])) / Math.PI;
    const around = this.environment.fromAbove * lighting.ambient;
    return Math.min(0.85, sun / Math.max(sun + around, 1e-4));
  }

  // The ground under the meshes, as far as its shadow or its grid reach.
  private groundOf(
    box: Box,
    floor: number,
    wide: boolean,
  ): { center: Vec3; fade: number; reach: number; matrix: Mat4 } {
    const middle = boxCenter(box);
    const center: Vec3 = [middle[0], floor, middle[2]];
    const diagonal = Math.max(boxDiagonal(box), 1e-3);
    const fade = diagonal * 1.4;
    // The grid reaches further than the shadow and fades out, so it seems to go on.
    const reach = wide ? diagonal * 3 : fade;
    return { center, fade, reach, matrix: modelMatrix(center, [0, 0, 0], [reach, 1, reach]) };
  }

  private drawGround(
    camera: Camera,
    lightMatrix: Mat4,
    box: Box,
    floor: number,
    shadow: { strength: number; darkness: number; softness: number },
    grid: boolean,
    wide: boolean,
    occlusion: boolean,
  ): void {
    const { gl } = this;
    const { program, uniforms } = this.ground;
    const diagonal = Math.max(boxDiagonal(box), 1e-3);
    const { center, fade, reach, matrix } = this.groundOf(box, floor, wide);
    gl.useProgram(program);
    this.occlusion.bind(uniforms, occlusion);
    this.shadows.bind(uniforms, shadow.softness);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniformMatrix4fv(uniforms.uModel, false, matrix);
    gl.uniform3fv(uniforms.uCenter, center);
    gl.uniform1f(uniforms.uFade, fade);
    gl.uniform1f(uniforms.uStrength, shadow.strength);
    gl.uniform1f(uniforms.uDarkness, shadow.darkness);
    gl.uniform1f(uniforms.uGrid, grid ? 1 : 0);
    gl.uniform1f(uniforms.uCell, 10 ** Math.floor(Math.log10(diagonal / 4)));
    gl.uniform1f(uniforms.uReach, reach);
    gl.uniformMatrix4fv(uniforms.uStage, false, camera.stage);
  }

  private drawGroundQuad(): void {
    const { gl } = this;
    gl.depthMask(false);
    gl.bindVertexArray(this.groundQuad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.depthMask(true);
  }

  // The map of the light of the environment that a frame shows. Its samplers are always set, as two of another type may not share a
  // unit, even when nothing is read.
  private bindEnvironmentShadow(
    uniforms: Program['uniforms'],
    light: EnvironmentLight,
    matrix: Mat4,
    strength: number,
  ): void {
    const { gl } = this;
    this.environmentShadows.bind(uniforms, light.mode === 1 ? light.softness : 0);
    gl.uniform1i(uniforms.uEnvMode, light.mode);
    gl.uniform3fv(uniforms.uEnvDirection, light.mode === 0 ? [0, 1, 0] : light.direction);
    gl.uniformMatrix4fv(uniforms.uEnvLight, false, matrix);
    if (light.mode === 2) {
      gl.uniform3fv(
        uniforms.uEnvLightColor,
        light.color.map(value => value * strength),
      );
      gl.uniform1f(uniforms.uEnvGround, light.ground);
    }
  }

  // What the ground reflects: the solid meshes again, turned over at the ground, as strong as the ground reflects. Each pixel
  // takes the nearest of them once, so they are drawn for their depth first and for their color after.
  private drawReflection(
    instances: readonly Instance[],
    floor: number,
    [strength, reach]: readonly [number, number],
    lightMatrix: Mat4,
    environmentMatrix: Mat4,
  ): void {
    const { gl } = this;
    const { uniforms } = this.main;
    const mirror = modelMatrix([0, 2 * floor, 0], [0, 0, 0], [1, -1, 1]);
    // What is turned over lies where the maps of the lights have nothing, so they are asked for where it came from.
    gl.uniformMatrix4fv(uniforms.uLight, false, multiply(lightMatrix, mirror));
    gl.uniformMatrix4fv(uniforms.uEnvLight, false, multiply(environmentMatrix, mirror));
    this.occlusion.bind(uniforms, false);
    gl.colorMask(false, false, false, false);
    this.drawInstances(instances, mirror);
    gl.colorMask(true, true, true, true);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform3f(uniforms.uMirror, floor, reach, strength);
    this.drawInstances(instances, mirror);
    gl.uniform3f(uniforms.uMirror, 0, 0, 0);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.depthFunc(gl.LESS);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniformMatrix4fv(uniforms.uEnvLight, false, environmentMatrix);
  }

  private drawInstances(instances: readonly Instance[], mirror?: Mat4): void {
    const { gl } = this;
    const { uniforms } = this.main;
    for (const { mesh, primitive, world: placed } of instances) {
      const world = mirror ? multiply(mirror, placed) : placed;
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
    this.probe.destroy();
    for (const texture of this.planeTextures) {
      gl.deleteTexture(texture);
    }
    this.planeTextures.clear();
    for (const program of this.planePrograms.values()) {
      gl.deleteProgram(program);
    }
    gl.deleteVertexArray(this.planeQuad);
    gl.deleteBuffer(this.planeBuffer);
    this.shadows.destroy();
    this.environmentShadows.destroy();
    this.accumulation.destroy();
    this.tracer.destroy();
    this.environment.destroy();
    this.occlusion.destroy();
    gl.deleteVertexArray(this.groundQuad);
    gl.deleteBuffer(this.groundBuffer);
    for (const { program } of [this.main, this.ground]) {
      gl.deleteProgram(program);
    }
  }
}
