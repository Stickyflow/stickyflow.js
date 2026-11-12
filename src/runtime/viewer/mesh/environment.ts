// The world around a Scene, as an equirectangular picture of linear light: row 0 looks straight up, column 0 straight back.
export interface EnvironmentImage {
  width: number;
  height: number;
  // Red, green and blue for each pixel, row by row.
  data: Float32Array;
}

export const STUDIO = 'studio';
const MAX_WIDTH = 1024;
const SMALLEST_HEIGHT = 4;

// A direction for a place on the picture, the same rule as in the shaders.
function direction(u: number, v: number): [number, number, number] {
  const theta = v * Math.PI;
  const phi = (u - 0.5) * 2 * Math.PI;
  return [Math.sin(theta) * Math.sin(phi), Math.cos(theta), -Math.sin(theta) * Math.cos(phi)];
}

// Radiance .hdr, flat or run-length encoded.
export function parseHdr(buffer: ArrayBuffer): EnvironmentImage {
  const bytes = new Uint8Array(buffer);
  let at = 0;
  const line = () => {
    let text = '';
    while (at < bytes.length && bytes[at] !== 10) {
      text += String.fromCharCode(bytes[at++]);
    }
    at++;
    return text;
  };
  if (!line().startsWith('#?')) {
    throw new Error('not a Radiance .hdr file');
  }
  while (at < bytes.length && line() !== '') {
    // The header says how the file was made; the size comes after it.
  }
  const size = /^-Y (\d+) \+X (\d+)$/.exec(line().trim());
  if (!size) {
    throw new Error('an .hdr file must run from the top left, row by row');
  }
  const height = Number(size[1]);
  const width = Number(size[2]);
  const data = new Float32Array(width * height * 3);
  const row = new Uint8Array(width * 4);
  for (let y = 0; y < height; y++) {
    const encoded =
      width >= 8 &&
      width < 0x8000 &&
      bytes[at] === 2 &&
      bytes[at + 1] === 2 &&
      ((bytes[at + 2] << 8) | bytes[at + 3]) === width;
    if (encoded) {
      at += 4;
      for (let channel = 0; channel < 4; channel++) {
        let x = 0;
        while (x < width) {
          let count = bytes[at++];
          if (count > 128) {
            count -= 128;
            const value = bytes[at++];
            for (let i = 0; i < count; i++) {
              row[x++ * 4 + channel] = value;
            }
          } else {
            for (let i = 0; i < count; i++) {
              row[x++ * 4 + channel] = bytes[at++];
            }
          }
        }
      }
    } else {
      row.set(bytes.subarray(at, at + width * 4));
      at += width * 4;
    }
    for (let x = 0; x < width; x++) {
      const exponent = row[x * 4 + 3];
      const scale = exponent ? 2 ** (exponent - 136) : 0;
      const target = (y * width + x) * 3;
      data[target] = row[x * 4] * scale;
      data[target + 1] = row[x * 4 + 1] * scale;
      data[target + 2] = row[x * 4 + 2] * scale;
    }
  }
  return shrink({ width, height, data });
}

// An ordinary picture, as 8 bit sRGB with 4 values per pixel, taken as linear light.
export function fromPixels(width: number, height: number, pixels: Uint8ClampedArray): EnvironmentImage {
  const data = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    for (let channel = 0; channel < 3; channel++) {
      data[i * 3 + channel] = (pixels[i * 4 + channel] / 255) ** 2.2;
    }
  }
  return shrink({ width, height, data });
}

function half(image: EnvironmentImage): EnvironmentImage {
  const width = Math.max(1, image.width >> 1);
  const height = Math.max(1, image.height >> 1);
  const data = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ]) {
          const sx = Math.min(image.width - 1, x * 2 + dx);
          const sy = Math.min(image.height - 1, y * 2 + dy);
          sum += image.data[(sy * image.width + sx) * 3 + channel];
        }
        data[(y * width + x) * 3 + channel] = sum / 4;
      }
    }
  }
  return { width, height, data };
}

function shrink(image: EnvironmentImage): EnvironmentImage {
  let result = image;
  while (result.width > MAX_WIDTH) {
    result = half(result);
  }
  return result;
}

// The picture and its smaller copies, down to a few rows.
export function mipChain(image: EnvironmentImage): EnvironmentImage[] {
  const chain = [image];
  while (chain[chain.length - 1].height > SMALLEST_HEIGHT) {
    chain.push(half(chain[chain.length - 1]));
  }
  return chain;
}

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

// A softbox: a bright rectangle on the sphere around a direction, its size as half angles in degrees, with soft edges.
interface Softbox {
  toward: [number, number, number];
  width: number;
  height: number;
  light: [number, number, number];
}

function softbox(d: [number, number, number], box: Softbox): [number, number, number] {
  const [fx, fy, fz] = box.toward;
  const length = Math.hypot(fx, fy, fz);
  const forward = [fx / length, fy / length, fz / length];
  const facing = d[0] * forward[0] + d[1] * forward[1] + d[2] * forward[2];
  if (facing <= 0) {
    return [0, 0, 0];
  }
  const helper = Math.abs(forward[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const right = [
    helper[1] * forward[2] - helper[2] * forward[1],
    helper[2] * forward[0] - helper[0] * forward[2],
    helper[0] * forward[1] - helper[1] * forward[0],
  ];
  const rightLength = Math.hypot(right[0], right[1], right[2]);
  const r = right.map(value => value / rightLength);
  const up = [
    forward[1] * r[2] - forward[2] * r[1],
    forward[2] * r[0] - forward[0] * r[2],
    forward[0] * r[1] - forward[1] * r[0],
  ];
  const across = Math.atan2(d[0] * r[0] + d[1] * r[1] + d[2] * r[2], facing) * (180 / Math.PI);
  const along = Math.atan2(d[0] * up[0] + d[1] * up[1] + d[2] * up[2], facing) * (180 / Math.PI);
  const edge = (value: number, size: number) => 1 - smooth(size * 0.82, size, Math.abs(value));
  const strength = edge(across, box.width) * edge(along, box.height);
  return [box.light[0] * strength, box.light[1] * strength, box.light[2] * strength];
}

const SOFTBOXES: Softbox[] = [
  { toward: [0.1, 1, 0.35], width: 20, height: 12, light: [7, 6.9, 6.7] },
  { toward: [0.9, 0.3, 0.55], width: 9, height: 20, light: [5, 4.9, 4.7] },
  { toward: [-1, 0.15, 0.2], width: 4, height: 32, light: [3.4, 3.5, 3.7] },
  { toward: [-0.3, 0.4, -1], width: 16, height: 8, light: [2.4, 2.4, 2.5] },
];

// A photo studio: a soft grey room, lit by a large box from above and smaller ones at the sides and behind.
export function studioEnvironment(width = 512, height = 256): EnvironmentImage {
  const data = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = direction((x + 0.5) / width, (y + 0.5) / height);
      const up = smooth(-0.25, 0.6, d[1]);
      const wall = 0.16 + 0.22 * up;
      const color = [wall * 1.02, wall, wall * 0.97];
      for (const box of SOFTBOXES) {
        const light = softbox(d, box);
        color[0] += light[0];
        color[1] += light[1];
        color[2] += light[2];
      }
      data.set(color, (y * width + x) * 3);
    }
  }
  return { width, height, data };
}

// The light that reaches a matte surface from every side, as nine numbers per color: the shaders add them up for a normal.
// Each is already divided by pi, so a color times the sum is what the surface sends back.
export function irradiance(image: EnvironmentImage): Float32Array {
  let source = image;
  while (source.width > 128) {
    source = half(source);
  }
  const result = new Float32Array(27);
  const { width, height, data } = source;
  const cell = ((2 * Math.PI) / width) * (Math.PI / height);
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    const weight = cell * Math.sin(v * Math.PI);
    for (let x = 0; x < width; x++) {
      const [dx, dy, dz] = direction((x + 0.5) / width, v);
      const basis = [
        0.282095,
        0.488603 * dy,
        0.488603 * dz,
        0.488603 * dx,
        1.092548 * dx * dy,
        1.092548 * dy * dz,
        0.315392 * (3 * dz * dz - 1),
        1.092548 * dx * dz,
        0.546274 * (dx * dx - dy * dy),
      ];
      const at = (y * width + x) * 3;
      for (let i = 0; i < 9; i++) {
        const w = basis[i] * weight;
        result[i * 3] += data[at] * w;
        result[i * 3 + 1] += data[at + 1] * w;
        result[i * 3 + 2] += data[at + 2] * w;
      }
    }
  }
  // How much each band survives the cosine of a surface, over pi.
  const band = [1, 2 / 3, 2 / 3, 2 / 3, 1 / 4, 1 / 4, 1 / 4, 1 / 4, 1 / 4];
  for (let i = 0; i < 27; i++) {
    result[i] *= band[Math.floor(i / 3)];
  }
  return result;
}

// The sky half of the environment on a small copy of the picture: how much light comes from each part, counted by how large the
// part is on the sphere.
interface Sky {
  width: number;
  height: number;
  rows: number;
  // Brightness times the size of the part on the sphere, for each part.
  weights: Float64Array;
  colors: Float32Array;
  // All the light of the sky, added up over the sphere.
  total: number;
}

const brightness = (data: ArrayLike<number>, at: number) =>
  0.2126 * data[at] + 0.7152 * data[at + 1] + 0.0722 * data[at + 2];

function skyOf(image: EnvironmentImage): Sky {
  let source = image;
  while (source.width > 128) {
    source = half(source);
  }
  const { width, height, data } = source;
  // Down to just above the horizon. What lies under it is behind the ground the meshes stand on.
  const rows = Math.max(1, Math.floor(height * 0.5) - 1);
  const weights = new Float64Array(width * rows);
  const cell = (Math.PI / height) * ((2 * Math.PI) / width);
  let total = 0;
  for (let y = 0; y < rows; y++) {
    const size = Math.sin(((y + 0.5) / height) * Math.PI) * cell;
    for (let x = 0; x < width; x++) {
      const weight = brightness(data, (y * width + x) * 3) * size;
      weights[y * width + x] = weight;
      total += weight;
    }
  }
  return { width, height, rows, weights, colors: data, total: total || 1 };
}

// One light of the sky for a frame of a still picture. Lights are picked as often as they are bright, so each stands for the
// same share of all the light: `color` is that share in the color of the light, already divided by pi as a matte surface wants
// it, and `ground` is what its shadow counts for on a surface facing up, where the mean over all lights is 1.
export interface SkyLight {
  direction: [number, number, number];
  color: [number, number, number];
  ground: number;
}

// Four numbers from 0 to 1 give one light: two pick the part of the sky, two the place within it.
export type LightPicker = (row: number, column: number, across: number, down: number) => SkyLight;

export function lightPicker(image: EnvironmentImage): LightPicker {
  const { width, height, rows, weights, colors, total } = skyOf(image);
  const rowTotals = Array.from({ length: rows }, (_, y) =>
    weights.subarray(y * width, (y + 1) * width).reduce((a, b) => a + b, 0),
  );
  // How much of the light a surface facing up gets, as a share of all of it.
  let upward = 0;
  for (let y = 0; y < rows; y++) {
    upward += rowTotals[y] * Math.cos(((y + 0.5) / height) * Math.PI);
  }
  upward = upward / total || 1;
  const pick = (values: ArrayLike<number>, sum: number, at: number) => {
    let left = at * sum;
    for (let i = 0; i < values.length; i++) {
      left -= values[i];
      if (left <= 0) {
        return i;
      }
    }
    return values.length - 1;
  };
  return (row, column, across, down) => {
    const y = pick(rowTotals, total, row);
    const x = pick(weights.subarray(y * width, (y + 1) * width), rowTotals[y] || 1, column);
    const at = (y * width + x) * 3;
    const scale = total / Math.PI / (brightness(colors, at) || 1);
    const towards = direction((x + across) / width, (y + down) / height);
    return {
      direction: towards,
      color: [colors[at] * scale, colors[at + 1] * scale, colors[at + 2] * scale],
      ground: Math.max(0, towards[1]) / upward,
    };
  };
}

// One large light that stands for the whole sky while the picture moves: where it is on the mean, as a surface facing up sees
// the lights, and how wide, in degrees, so that its soft shadow lies where the shadows of all the lights together would.
export interface DominantLight {
  direction: [number, number, number];
  size: number;
  // How much of the light its shadow takes away: much where the lights of the sky lie together, little where they lie all
  // round, as there no one shadow stands for them.
  strength: number;
}

export function dominantLight(image: EnvironmentImage): DominantLight {
  const { width, height, rows, weights } = skyOf(image);
  const sum = [0, 0, 0];
  let total = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const [dx, dy, dz] = direction((x + 0.5) / width, (y + 0.5) / height);
      const weight = weights[y * width + x] * dy;
      sum[0] += dx * weight;
      sum[1] += dy * weight;
      sum[2] += dz * weight;
      total += weight;
    }
  }
  const length = Math.hypot(sum[0], sum[1], sum[2]);
  if (!total || !length) {
    return { direction: [0, 1, 0], size: 40, strength: 0.3 };
  }
  // The more the lights spread, the shorter their mean: its length gives how far they lie from it, on average.
  const spread = (Math.acos(Math.min(1, length / total)) * 180) / Math.PI;
  const size = Math.min(60, Math.max(6, spread * 2));
  return {
    direction: [sum[0] / length, sum[1] / length, sum[2] / length],
    size,
    // A narrow light throws the one shadow there is. The wider the lights lie, the less one shadow says about them.
    strength: Math.max(0.06, 0.6 * (1 - (size - 6) / 54) ** 1.5),
  };
}
