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
import type { EnvironmentImage } from './environment';
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
import { type Caster, ShadowMap } from './shadowMap';

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
  private readonly planeQuad: WebGLVertexArrayObject;
  readonly planeBuffer: WebGLBuffer;
  private readonly assets = new Map<string, GpuPrimitive[]>();
  private readonly shadows: ShadowMap;
  private readonly environment: EnvironmentMap;
  private readonly occlusion: ScreenOcclusion;
  private readonly groundQuad: WebGLVertexArrayObject | null;
  private readonly groundBuffer: WebGLBuffer | null;

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
      ...ENVIRONMENT_UNIFORMS,
      ...SCREEN_OCCLUSION_UNIFORMS,
    ]);
    this.ground = link(gl, GROUND_FRAGMENT, [
      ...common,
      'uShadow',
      'uCenter',
      'uFade',
      'uStrength',
      'uGrid',
      'uCell',
      'uReach',
      'uStage',
      ...SCREEN_OCCLUSION_UNIFORMS,
    ]);

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

  // Lights the meshes with a picture of the world around them, or with the sun and sky alone when there is none.
  setEnvironment(image: EnvironmentImage | null): void {
    this.environment.set(image);
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

  draw(
    meshes: readonly Mesh[],
    camera: Camera | undefined,
    options: {
      shadows?: boolean;
      planes?: readonly Plane[];
      lighting?: Lighting;
      grid?: boolean;
      environmentTurn?: number;
    } = {},
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
    const lightMatrix = options.shadows
      ? this.shadows.update(this.casters(instances, planes), box, lighting.direction)
      : identity();
    const seeThrough = ({ mesh, primitive }: Instance) => mesh.opacity < 1 || primitive.source.material.blend;
    const solids = instances
      .filter(instance => !seeThrough(instance))
      .map(({ world, primitive }) => ({ world, draw: () => this.drawPrimitive(primitive) }));
    // The occlusion comes with an environment, as without one the light of the sky is too plain to need it.
    const occlusion =
      this.environment.present &&
      this.occlusion.draw(camera, solids, boxDiagonal(box) * 0.08, this.groundOf(box, options.grid ?? false).matrix);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const { program, uniforms } = this.main;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    for (const { unit, sampler } of MAP_SLOTS) {
      gl.uniform1i(uniforms[sampler], unit);
    }
    this.shadows.bind(uniforms);
    gl.uniform1f(uniforms.uShadows, options.shadows ? 1 : 0);
    gl.uniform3fv(uniforms.uKey, lighting.direction);
    gl.uniform3fv(uniforms.uSun, lighting.sun);
    gl.uniform3fv(uniforms.uGlare, lighting.glare);
    gl.uniform3fv(uniforms.uSky, lighting.sky);
    gl.uniform3fv(uniforms.uFloor, lighting.floor);
    gl.uniform1f(uniforms.uFill, this.environment.present ? 0 : lighting.fill);
    this.environment.bind(uniforms, options.environmentTurn ?? 0, lighting.ambient);
    this.occlusion.bind(uniforms, occlusion);

    this.drawInstances(instances.filter(instance => !seeThrough(instance)));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (options.shadows || options.grid || occlusion) {
      const strength = options.shadows ? lighting.groundShadow : 0;
      this.drawGround(camera, lightMatrix, box, strength, options.grid ?? false, occlusion);
    }
    this.drawPlanes(camera, planes);
    gl.useProgram(program);
    // What is seen through lies over what the occlusion was worked out for, so it takes none.
    this.occlusion.bind(uniforms, false);
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

  // The ground under the meshes, as far as its shadow or its grid reach.
  private groundOf(box: Box, grid: boolean): { center: Vec3; fade: number; reach: number; matrix: Mat4 } {
    const middle = boxCenter(box);
    const center: Vec3 = [middle[0], box.min[1], middle[2]];
    const diagonal = Math.max(boxDiagonal(box), 1e-3);
    const fade = diagonal * 1.4;
    // The grid reaches further than the shadow and fades out, so it seems to go on.
    const reach = grid ? diagonal * 3 : fade;
    return { center, fade, reach, matrix: modelMatrix(center, [0, 0, 0], [reach, 1, reach]) };
  }

  private drawGround(
    camera: Camera,
    lightMatrix: Mat4,
    box: Box,
    strength: number,
    grid: boolean,
    occlusion: boolean,
  ): void {
    const { gl } = this;
    const { program, uniforms } = this.ground;
    const diagonal = Math.max(boxDiagonal(box), 1e-3);
    const { center, fade, reach, matrix } = this.groundOf(box, grid);
    gl.useProgram(program);
    this.occlusion.bind(uniforms, occlusion);
    this.shadows.bind(uniforms);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(uniforms.uLight, false, lightMatrix);
    gl.uniformMatrix4fv(uniforms.uModel, false, matrix);
    gl.uniform3fv(uniforms.uCenter, center);
    gl.uniform1f(uniforms.uFade, fade);
    gl.uniform1f(uniforms.uStrength, strength);
    gl.uniform1f(uniforms.uGrid, grid ? 1 : 0);
    gl.uniform1f(uniforms.uCell, 10 ** Math.floor(Math.log10(diagonal / 4)));
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
    this.environment.destroy();
    this.occlusion.destroy();
    gl.deleteVertexArray(this.groundQuad);
    gl.deleteBuffer(this.groundBuffer);
    for (const { program } of [this.main, this.ground]) {
      gl.deleteProgram(program);
    }
  }
}
