// Terrain: a block of land whose top follows a field of heights. The heights come from a picture, and another picture can
// lie on the top, as a map does. The block is cut straight down at its four sides and stands on y = 0 with its middle at
// the origin; the top of the picture is its far side, toward -z.
export interface TerrainShape {
  // The address of the picture of heights.
  heights: string;
  // The address of the picture that lies on the top.
  picture?: string;
  // The Canvas whose drawing lies on the top instead, by its name.
  surface?: string;
  // How wide the block is, how high its land rises from its lowest place to its highest, and how deep the block is.
  size: [number, number, number];
  // How thick the block is under the lowest place of its land.
  base?: number;
  // How many points the longer side of the top has at most.
  detail?: number;
}

// Heights from 0, the lowest, to 1, the highest, row by row from the far side.
export interface HeightField {
  columns: number;
  rows: number;
  values: Float32Array;
}

export interface TerrainGeometry {
  // The top, with a place in the picture for each of its points.
  top: { positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: Uint32Array };
  // The four sides and the underside.
  sides: { positions: Float32Array; normals: Float32Array };
}

const DEFAULT_DETAIL = 256;
const MOST_DETAIL = 1024;

// How many points each side of the top gets: as many as the field has, up to what the detail allows.
export function terrainGrid(shape: TerrainShape, columns: number, rows: number): [number, number] {
  const most = Math.min(Math.max(Math.round(shape.detail ?? DEFAULT_DETAIL), 2), MOST_DETAIL);
  const scale = Math.min(1, most / Math.max(columns, rows));
  return [Math.max(2, Math.round(columns * scale)), Math.max(2, Math.round(rows * scale))];
}

export function buildTerrain(shape: TerrainShape, field: HeightField): TerrainGeometry {
  const { columns, rows, values } = field;
  const [width, rise, depth] = shape.size;
  const base = Math.max(shape.base ?? rise * 0.25, 0);
  const x = (column: number) => (column / (columns - 1) - 0.5) * width;
  const z = (row: number) => (row / (rows - 1) - 0.5) * depth;
  const y = (column: number, row: number) => base + values[row * columns + column] * rise;

  const positions = new Float32Array(columns * rows * 3);
  const normals = new Float32Array(columns * rows * 3);
  const uvs = new Float32Array(columns * rows * 2);
  const stepX = width / (columns - 1);
  const stepZ = depth / (rows - 1);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const at = row * columns + column;
      positions.set([x(column), y(column, row), z(row)], at * 3);
      uvs.set([column / (columns - 1), row / (rows - 1)], at * 2);
      // The way the land faces, from how it rises to its neighbours on both sides.
      const left = Math.max(column - 1, 0);
      const right = Math.min(column + 1, columns - 1);
      const far = Math.max(row - 1, 0);
      const near = Math.min(row + 1, rows - 1);
      const slopeX = (y(right, row) - y(left, row)) / ((right - left) * stepX);
      const slopeZ = (y(column, near) - y(column, far)) / ((near - far) * stepZ);
      const length = Math.hypot(slopeX, 1, slopeZ);
      normals.set([-slopeX / length, 1 / length, -slopeZ / length], at * 3);
    }
  }
  const indices = new Uint32Array((columns - 1) * (rows - 1) * 6);
  let next = 0;
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column;
      const b = a + columns;
      indices.set([a, b, a + 1, a + 1, b, b + 1], next);
      next += 6;
    }
  }

  const sidePositions: number[] = [];
  const sideNormals: number[] = [];
  // A wall under one step of an edge, from the land down to the underside, facing out of the block.
  const wall = (from: [number, number], to: [number, number], facing: [number, number, number]) => {
    const [ax, ay, az] = [x(from[0]), y(from[0], from[1]), z(from[1])];
    const [bx, by, bz] = [x(to[0]), y(to[0], to[1]), z(to[1])];
    sidePositions.push(ax, ay, az, ax, 0, az, bx, 0, bz, ax, ay, az, bx, 0, bz, bx, by, bz);
    for (let corner = 0; corner < 6; corner++) {
      sideNormals.push(...facing);
    }
  };
  for (let column = 0; column < columns - 1; column++) {
    wall([column + 1, 0], [column, 0], [0, 0, -1]);
    wall([column, rows - 1], [column + 1, rows - 1], [0, 0, 1]);
  }
  for (let row = 0; row < rows - 1; row++) {
    wall([0, row], [0, row + 1], [-1, 0, 0]);
    wall([columns - 1, row + 1], [columns - 1, row], [1, 0, 0]);
  }
  const [w, d] = [width / 2, depth / 2];
  sidePositions.push(-w, 0, -d, w, 0, -d, w, 0, d, -w, 0, -d, w, 0, d, -w, 0, d);
  for (let corner = 0; corner < 6; corner++) {
    sideNormals.push(0, -1, 0);
  }
  return {
    top: { positions, normals, uvs, indices },
    sides: { positions: new Float32Array(sidePositions), normals: new Float32Array(sideNormals) },
  };
}

// Brings a field of heights to the points of a grid: each point is the mean of the part of the field it stands for.
export function resampleHeights(field: HeightField, columns: number, rows: number): HeightField {
  if (columns === field.columns && rows === field.rows) {
    return field;
  }
  const values = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    const top = Math.floor((row * field.rows) / rows);
    const bottom = Math.max(top + 1, Math.floor(((row + 1) * field.rows) / rows));
    for (let column = 0; column < columns; column++) {
      const left = Math.floor((column * field.columns) / columns);
      const right = Math.max(left + 1, Math.floor(((column + 1) * field.columns) / columns));
      let sum = 0;
      for (let j = top; j < bottom; j++) {
        for (let i = left; i < right; i++) {
          sum += field.values[j * field.columns + i];
        }
      }
      values[row * columns + column] = sum / ((bottom - top) * (right - left));
    }
  }
  return { columns, rows, values };
}

// The heights a picture holds, from 0 at its lowest place to 1 at its highest. A grey picture is brighter the higher the land
// is. A picture in colors holds the height in metres in its channels, as red * 256 + green + blue / 256 - 32768.
export function heightsOfPixels(pixels: ArrayLike<number>, columns: number, rows: number): HeightField {
  let grey = true;
  for (let at = 0; at < columns * rows * 4 && grey; at += 4) {
    grey = Math.abs(pixels[at] - pixels[at + 1]) <= 2 && Math.abs(pixels[at] - pixels[at + 2]) <= 2;
  }
  const values = new Float32Array(columns * rows);
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (let at = 0; at < columns * rows; at++) {
    const [red, green, blue] = [pixels[at * 4], pixels[at * 4 + 1], pixels[at * 4 + 2]];
    const value = grey ? red : red * 256 + green + blue / 256 - 32768;
    values[at] = value;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  const range = high - low || 1;
  for (let at = 0; at < values.length; at++) {
    values[at] = (values[at] - low) / range;
  }
  return { columns, rows, values };
}

export const TERRAIN_ASSET = 'terrain:';

export const terrainAssetName = (shape: TerrainShape): string => TERRAIN_ASSET + JSON.stringify(shape);

export function terrainOfAsset(asset: string): TerrainShape | undefined {
  if (!asset.startsWith(TERRAIN_ASSET)) {
    return undefined;
  }
  try {
    return JSON.parse(asset.slice(TERRAIN_ASSET.length)) as TerrainShape;
  } catch {
    return undefined;
  }
}
