// Formats that bring geometry and little else. They become the same asset as a glTF file, so nothing behind the reader knows the difference.

export interface PlainGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs?: Float32Array;
}

const STL_HEADER = 80;
const STL_TRIANGLE = 50;

// For a mesh that brings no normals: flat ones, face by face, added up where a vertex is shared.
export function computeNormals(positions: Float32Array, indices?: ArrayLike<number>): Float32Array {
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

export function isBinaryStl(data: ArrayBuffer): boolean {
  return (
    data.byteLength >= STL_HEADER + 4 &&
    data.byteLength === STL_HEADER + 4 + new DataView(data).getUint32(STL_HEADER, true) * STL_TRIANGLE
  );
}

function binaryStl(data: ArrayBuffer): PlainGeometry {
  const view = new DataView(data);
  const count = view.getUint32(STL_HEADER, true);
  const positions = new Float32Array(count * 9);
  for (let triangle = 0; triangle < count; triangle++) {
    const start = STL_HEADER + 4 + triangle * STL_TRIANGLE + 12;
    for (let value = 0; value < 9; value++) {
      positions[triangle * 9 + value] = view.getFloat32(start + value * 4, true);
    }
  }
  return { positions, normals: computeNormals(positions) };
}

export function parseStl(data: ArrayBuffer): PlainGeometry {
  if (isBinaryStl(data)) {
    return binaryStl(data);
  }
  const numbers: number[] = [];
  for (const match of new TextDecoder().decode(data).matchAll(/^\s*vertex\s+(\S+)\s+(\S+)\s+(\S+)/gm)) {
    numbers.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if (numbers.length === 0) {
    throw new Error('an STL file without triangles');
  }
  const positions = new Float32Array(numbers);
  return { positions, normals: computeNormals(positions) };
}

// A corner of a face names a place, and sometimes a picture coordinate and a normal, counted from 1 or from the end.
export function parseObj(text: string): PlainGeometry {
  const places: number[][] = [];
  const pictures: number[][] = [];
  const normals: number[][] = [];
  const outPlaces: number[] = [];
  const outPictures: number[] = [];
  const outNormals: number[] = [];
  let allPictures = true;
  let allNormals = true;
  const pick = (list: number[][], reference: string | undefined): number[] | undefined => {
    const number = Number(reference);
    return reference ? list[number < 0 ? list.length + number : number - 1] : undefined;
  };
  const corner = (reference: string) => {
    const [place, picture, normal] = reference.split('/');
    const at = pick(places, place);
    if (!at) {
      throw new Error('an OBJ face that names a vertex which is not there');
    }
    outPlaces.push(at[0], at[1], at[2]);
    const uv = pick(pictures, picture);
    allPictures &&= Boolean(uv);
    outPictures.push(uv?.[0] ?? 0, uv?.[1] ?? 0);
    const direction = pick(normals, normal);
    allNormals &&= Boolean(direction);
    outNormals.push(direction?.[0] ?? 0, direction?.[1] ?? 0, direction?.[2] ?? 0);
  };
  for (const line of text.split(/\r?\n/)) {
    const [kind, ...rest] = line.trim().split(/\s+/);
    if (kind === 'v') {
      places.push(rest.map(Number));
    } else if (kind === 'vt') {
      pictures.push(rest.map(Number));
    } else if (kind === 'vn') {
      normals.push(rest.map(Number));
    } else if (kind === 'f') {
      // A face of more corners becomes a fan of triangles.
      for (let i = 1; i + 1 < rest.length; i++) {
        corner(rest[0]);
        corner(rest[i]);
        corner(rest[i + 1]);
      }
    }
  }
  if (outPlaces.length === 0) {
    throw new Error('an OBJ file without faces');
  }
  const positions = new Float32Array(outPlaces);
  return {
    positions,
    normals: allNormals ? new Float32Array(outNormals) : computeNormals(positions),
    uvs: allPictures ? new Float32Array(outPictures) : undefined,
  };
}

export function looksLikeObj(text: string): boolean {
  return /^\s*v\s+\S+\s+\S+\s+\S+/m.test(text) && /^\s*f\s+\S+\s+\S+\s+\S+/m.test(text);
}
