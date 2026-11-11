import { fromQuaternionTrs, identity, type Mat4, multiply } from './matrix';
import { computeNormals, isBinaryStl, looksLikeObj, type PlainGeometry, parseObj, parseStl } from './meshFormats';

// A small reader for glTF 2.0, as a binary .glb or as a .gltf with its buffers, and for STL and OBJ. It keeps what a static mesh needs and reports the rest in `skipped`.

interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  normalized?: boolean;
  sparse?: unknown;
}

interface GltfBufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}

interface GltfPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
}

interface GltfNode {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}

interface GltfMaterial {
  alphaMode?: string;
  doubleSided?: boolean;
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: { index: number };
    metallicRoughnessTexture?: { index: number };
    metallicFactor?: number;
    roughnessFactor?: number;
  };
  normalTexture?: { index: number; scale?: number };
  occlusionTexture?: { index: number; strength?: number };
  emissiveTexture?: { index: number };
  emissiveFactor?: number[];
  extensions?: {
    KHR_materials_transmission?: { transmissionFactor?: number };
    KHR_materials_ior?: { ior?: number };
  };
}

interface Gltf {
  asset?: { version?: string };
  accessors?: GltfAccessor[];
  bufferViews?: GltfBufferView[];
  buffers?: Array<{ uri?: string; byteLength: number }>;
  images?: Array<{ uri?: string; bufferView?: number; mimeType?: string }>;
  textures?: Array<{ source?: number; sampler?: number }>;
  samplers?: TextureSampler[];
  materials?: GltfMaterial[];
  meshes?: Array<{ primitives: GltfPrimitive[] }>;
  nodes?: GltfNode[];
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
  extensionsRequired?: string[];
  animations?: unknown[];
  skins?: unknown[];
}

export interface TextureSampler {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
}

export type MaterialMapName = 'base' | 'normal' | 'surface' | 'occlusion' | 'emissive';

export interface MaterialMap {
  image: Blob | string;
  sampler?: TextureSampler;
}

export interface MeshMaterial {
  baseColor: [number, number, number, number];
  metallic: number;
  roughness: number;
  emissive: [number, number, number];
  normalScale: number;
  occlusionStrength: number;
  maps: Partial<Record<MaterialMapName, MaterialMap>>;
  blend: boolean;
  doubleSided: boolean;
  // How much of the light goes through the material, as in glass, and how strongly it bends there.
  transmission: number;
  ior: number;
}

export interface MeshPrimitive {
  positions: Float32Array;
  normals: Float32Array;
  uvs?: Float32Array;
  indices?: Uint16Array | Uint32Array | Uint8Array;
  transform: Mat4;
  material: MeshMaterial;
}

export interface MeshAsset {
  primitives: MeshPrimitive[];
  skipped: string[];
}

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const TRIANGLES = 4;
const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const SIZES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NORMALIZE_BY: Record<number, number> = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
// A file that brings no material of its own looks like matte clay.
const PLAIN_MATERIAL_COLOR: [number, number, number, number] = [0.72, 0.72, 0.72, 1];
const PLAIN_ROUGHNESS = 0.65;
const DEFAULT_MATERIAL: MeshMaterial = {
  baseColor: [1, 1, 1, 1],
  metallic: 1,
  roughness: 1,
  emissive: [0, 0, 0],
  normalScale: 1,
  occlusionStrength: 1,
  maps: {},
  blend: false,
  doubleSided: false,
  transmission: 0,
  ior: 1.5,
};

function readGlb(data: ArrayBuffer): { json: Gltf; bin?: ArrayBuffer } {
  const view = new DataView(data);
  if (data.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('not a GLB file');
  }
  if (view.getUint32(4, true) !== 2) {
    throw new Error(`GLB version ${view.getUint32(4, true)} is not supported`);
  }
  let json: Gltf | undefined;
  let bin: ArrayBuffer | undefined;
  let offset = 12;
  while (offset + 8 <= data.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > data.byteLength) {
      throw new Error('a GLB chunk runs past the end of the file');
    }
    if (type === CHUNK_JSON) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, start, length))) as Gltf;
    } else if (type === CHUNK_BIN && !bin) {
      bin = data.slice(start, start + length);
    }
    offset = start + length;
  }
  if (!json) {
    throw new Error('a GLB file without a JSON chunk');
  }
  return { json, bin };
}

function readGltf(data: ArrayBuffer): Gltf {
  try {
    return JSON.parse(new TextDecoder().decode(data)) as Gltf;
  } catch {
    throw new Error('neither GLB, glTF, STL nor OBJ');
  }
}

function dataUriBytes(uri: string): ArrayBuffer {
  const base64 = uri.slice(uri.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const relativeTo = (base: string, uri: string): string =>
  /^[a-z][a-z0-9+.-]*:/i.test(uri) || !base ? uri : `${base}${uri}`;

function accessorFloats(gltf: Gltf, buffers: ArrayBuffer[], index: number): Float32Array {
  const accessor = gltf.accessors?.[index];
  const bufferView = accessor?.bufferView === undefined ? undefined : gltf.bufferViews?.[accessor.bufferView];
  if (!accessor || !bufferView || accessor.sparse) {
    throw new Error('an accessor without data, or a sparse one');
  }
  const components = COMPONENTS[accessor.type];
  const size = SIZES[accessor.componentType];
  const stride = bufferView.byteStride || components * size;
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(buffers[bufferView.buffer]);
  const out = new Float32Array(accessor.count * components);
  const read: Record<number, (at: number) => number> = {
    5120: at => view.getInt8(at),
    5121: at => view.getUint8(at),
    5122: at => view.getInt16(at, true),
    5123: at => view.getUint16(at, true),
    5125: at => view.getUint32(at, true),
    5126: at => view.getFloat32(at, true),
  };
  const scale = accessor.normalized ? (NORMALIZE_BY[accessor.componentType] ?? 1) : 1;
  for (let i = 0; i < accessor.count; i++) {
    for (let c = 0; c < components; c++) {
      out[i * components + c] = read[accessor.componentType](start + i * stride + c * size) / scale;
    }
  }
  return out;
}

function accessorIndices(gltf: Gltf, buffers: ArrayBuffer[], index: number): Uint16Array | Uint32Array | Uint8Array {
  const accessor = gltf.accessors?.[index];
  const bufferView = accessor?.bufferView === undefined ? undefined : gltf.bufferViews?.[accessor.bufferView];
  if (!accessor || !bufferView) {
    throw new Error('an index accessor without data');
  }
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const buffer = buffers[bufferView.buffer];
  const size = SIZES[accessor.componentType];
  // A copy, as the offset in the buffer may not lie on a multiple of the size.
  const bytes = buffer.slice(start, start + accessor.count * size);
  if (accessor.componentType === 5125) {
    return new Uint32Array(bytes);
  }
  return accessor.componentType === 5123 ? new Uint16Array(bytes) : new Uint8Array(bytes);
}

function imageOf(gltf: Gltf, buffers: ArrayBuffer[], textureIndex: number, base: string): Blob | string | undefined {
  const source = gltf.textures?.[textureIndex]?.source;
  const image = source === undefined ? undefined : gltf.images?.[source];
  if (!image) {
    return undefined;
  }
  if (image.uri) {
    return relativeTo(base, image.uri);
  }
  const bufferView = image.bufferView === undefined ? undefined : gltf.bufferViews?.[image.bufferView];
  if (!bufferView) {
    return undefined;
  }
  const start = bufferView.byteOffset ?? 0;
  return new Blob([buffers[bufferView.buffer].slice(start, start + bufferView.byteLength)], {
    type: image.mimeType ?? 'image/png',
  });
}

function materialOf(gltf: Gltf, buffers: ArrayBuffer[], index: number | undefined, base: string): MeshMaterial {
  const material = index === undefined ? undefined : gltf.materials?.[index];
  if (!material) {
    return DEFAULT_MATERIAL;
  }
  const pbr = material.pbrMetallicRoughness;
  const [r = 1, g = 1, b = 1, a = 1] = pbr?.baseColorFactor ?? [];
  const emissive = material.emissiveFactor ?? [];
  if (material.emissiveTexture && !material.emissiveFactor) {
    emissive.push(0, 0, 0);
  }
  return {
    baseColor: [r, g, b, a],
    metallic: pbr?.metallicFactor ?? 1,
    roughness: pbr?.roughnessFactor ?? 1,
    emissive: [emissive[0] ?? 0, emissive[1] ?? 0, emissive[2] ?? 0],
    normalScale: material.normalTexture?.scale ?? 1,
    occlusionStrength: material.occlusionTexture?.strength ?? 1,
    maps: Object.fromEntries(
      (
        [
          ['base', pbr?.baseColorTexture],
          ['normal', material.normalTexture],
          ['surface', pbr?.metallicRoughnessTexture],
          ['occlusion', material.occlusionTexture],
          ['emissive', material.emissiveTexture],
        ] as const
      ).flatMap(([name, texture]) => {
        const image = texture && imageOf(gltf, buffers, texture.index, base);
        const sampler = texture && gltf.samplers?.[gltf.textures?.[texture.index]?.sampler ?? -1];
        return image ? [[name, { image, sampler }]] : [];
      }),
    ),
    blend: material.alphaMode === 'BLEND',
    doubleSided: material.doubleSided === true,
    transmission: material.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0,
    ior: material.extensions?.KHR_materials_ior?.ior ?? 1.5,
  };
}

function nodeMatrix(node: GltfNode): Mat4 {
  if (node.matrix) {
    return new Float32Array(node.matrix);
  }
  return fromQuaternionTrs(node.translation ?? [0, 0, 0], node.rotation ?? [0, 0, 0, 1], node.scale ?? [1, 1, 1]);
}

function readMeshes(gltf: Gltf, buffers: ArrayBuffer[], base: string): MeshAsset {
  const skipped = new Set<string>();
  const primitives: MeshPrimitive[] = [];
  if (gltf.animations?.length) {
    skipped.add('animations');
  }
  if (gltf.skins?.length) {
    skipped.add('skins');
  }
  const visit = (nodeIndex: number, parent: Mat4, depth: number) => {
    const node = gltf.nodes?.[nodeIndex];
    if (!node || depth > 64) {
      return;
    }
    const transform = multiply(parent, nodeMatrix(node));
    const mesh = node.mesh === undefined ? undefined : gltf.meshes?.[node.mesh];
    for (const primitive of mesh?.primitives ?? []) {
      if ((primitive.mode ?? TRIANGLES) !== TRIANGLES) {
        skipped.add('primitives that are not triangles');
        continue;
      }
      if (primitive.attributes.POSITION === undefined) {
        skipped.add('primitives without positions');
        continue;
      }
      const positions = accessorFloats(gltf, buffers, primitive.attributes.POSITION);
      const indices = primitive.indices === undefined ? undefined : accessorIndices(gltf, buffers, primitive.indices);
      primitives.push({
        positions,
        normals:
          primitive.attributes.NORMAL === undefined
            ? computeNormals(positions, indices)
            : accessorFloats(gltf, buffers, primitive.attributes.NORMAL),
        uvs:
          primitive.attributes.TEXCOORD_0 === undefined
            ? undefined
            : accessorFloats(gltf, buffers, primitive.attributes.TEXCOORD_0),
        indices,
        transform,
        material: materialOf(gltf, buffers, primitive.material, base),
      });
    }
    for (const child of node.children ?? []) {
      visit(child, transform, depth + 1);
    }
  };
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? gltf.nodes?.map((_, index) => index) ?? [];
  for (const root of roots) {
    visit(root, identity(), 0);
  }
  return { primitives, skipped: [...skipped] };
}

function plainAsset(geometry: PlainGeometry, skipped: string[]): MeshAsset {
  return {
    primitives: [
      {
        ...geometry,
        transform: identity(),
        material: {
          ...DEFAULT_MATERIAL,
          baseColor: PLAIN_MATERIAL_COLOR,
          metallic: 0,
          roughness: PLAIN_ROUGHNESS,
        },
      },
    ],
    skipped,
  };
}

// STL and OBJ are told by what is in the file, as an address need not have an ending.
function readPlainFormat(data: ArrayBuffer): MeshAsset | undefined {
  if (isBinaryStl(data)) {
    return plainAsset(parseStl(data), []);
  }
  const text = new TextDecoder().decode(data.slice(0, 1 << 20));
  const start = text.trimStart();
  if (start.startsWith('{')) {
    return undefined;
  }
  if (start.startsWith('solid') && /\bfacet\b/.test(text)) {
    return plainAsset(parseStl(data), []);
  }
  if (looksLikeObj(text)) {
    return plainAsset(
      parseObj(new TextDecoder().decode(data)),
      /^\s*(mtllib|usemtl)\s/m.test(text) ? ['materials'] : [],
    );
  }
  return undefined;
}

export async function parseMeshAsset(
  data: ArrayBuffer,
  base = '',
  load: (uri: string) => Promise<ArrayBuffer> = fetchBytes,
): Promise<MeshAsset> {
  const isGlb = data.byteLength >= 4 && new DataView(data).getUint32(0, true) === GLB_MAGIC;
  const plain = isGlb ? undefined : readPlainFormat(data);
  if (plain) {
    return plain;
  }
  const { json, bin } = isGlb ? readGlb(data) : { json: readGltf(data), bin: undefined };
  const unsupported = json.extensionsRequired ?? [];
  if (unsupported.length) {
    throw new Error(`the asset requires ${unsupported.join(', ')}, which is not supported`);
  }
  const buffers = await Promise.all(
    (json.buffers ?? []).map(async (buffer, index) => {
      if (!buffer.uri) {
        if (index === 0 && bin) {
          return bin;
        }
        throw new Error('a buffer without data');
      }
      return buffer.uri.startsWith('data:') ? dataUriBytes(buffer.uri) : load(relativeTo(base, buffer.uri));
    }),
  );
  return readMeshes(json, buffers, base);
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
  return response.arrayBuffer();
}

export async function loadMeshAsset(url: string): Promise<MeshAsset> {
  const base = url.startsWith('data:') ? '' : url.slice(0, url.lastIndexOf('/') + 1);
  return parseMeshAsset(await fetchBytes(url), base);
}
