import { fromQuaternionTrs, identity, type Mat4, multiply } from './matrix';

// A small reader for glTF 2.0, as a binary .glb or as a .gltf with its buffers. It keeps what a static mesh needs and reports the rest in `skipped`.

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
    metallicFactor?: number;
    roughnessFactor?: number;
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

export interface MeshMaterial {
  baseColor: [number, number, number, number];
  metallic: number;
  roughness: number;
  image?: Blob | string;
  sampler?: TextureSampler;
  blend: boolean;
  doubleSided: boolean;
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
const DEFAULT_MATERIAL: MeshMaterial = {
  baseColor: [1, 1, 1, 1],
  metallic: 1,
  roughness: 1,
  blend: false,
  doubleSided: false,
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
    throw new Error('neither a GLB nor a glTF file');
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

// For a mesh that brings no normals: flat ones, face by face, added up where a vertex is shared.
function computeNormals(positions: Float32Array, indices?: ArrayLike<number>): Float32Array {
  const normals = new Float32Array(positions.length);
  const count = indices ? indices.length : positions.length / 3;
  for (let i = 0; i + 2 < count; i += 3) {
    const [a, b, c] = indices ? [indices[i], indices[i + 1], indices[i + 2]] : [i, i + 1, i + 2];
    const [ax, ay, az] = [positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]];
    const [ux, uy, uz] = [positions[b * 3] - ax, positions[b * 3 + 1] - ay, positions[b * 3 + 2] - az];
    const [vx, vy, vz] = [positions[c * 3] - ax, positions[c * 3 + 1] - ay, positions[c * 3 + 2] - az];
    const [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    for (const vertex of [a, b, c]) {
      normals[vertex * 3] += nx;
      normals[vertex * 3 + 1] += ny;
      normals[vertex * 3 + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  return normals;
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
  return {
    baseColor: [r, g, b, a],
    metallic: pbr?.metallicFactor ?? 1,
    roughness: pbr?.roughnessFactor ?? 1,
    image: pbr?.baseColorTexture ? imageOf(gltf, buffers, pbr.baseColorTexture.index, base) : undefined,
    sampler: gltf.samplers?.[gltf.textures?.[pbr?.baseColorTexture?.index ?? -1]?.sampler ?? -1],
    blend: material.alphaMode === 'BLEND',
    doubleSided: material.doubleSided === true,
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

export async function parseMeshAsset(
  data: ArrayBuffer,
  base = '',
  load: (uri: string) => Promise<ArrayBuffer> = fetchBytes,
): Promise<MeshAsset> {
  const isGlb = data.byteLength >= 4 && new DataView(data).getUint32(0, true) === GLB_MAGIC;
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
