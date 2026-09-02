import { COLOR_TOKEN_PATTERN } from './colorToken';

export interface GradientStop {
  position: number;
  color: string;
}

export interface GradientFill {
  type: 'gradient';
  angle: number;
  stops: GradientStop[];
}

export interface MeshPoint {
  id: string;
  x: number;
  y: number;
  color: string;
}

export interface MeshFill {
  type: 'mesh';
  points: MeshPoint[];
}

export type DecodedColor = string | GradientFill | MeshFill;

function decodeGradient(source: string): GradientFill | undefined {
  const match = source.match(/^gradient\(\s*([-\d.]+)\s*,\s*(.*)\)\s*$/);
  if (!match) {
    return undefined;
  }

  const stops: GradientStop[] = [];
  const stopPattern = new RegExp(`(${COLOR_TOKEN_PATTERN})\\s+([-\\d.]+)%`, 'g');
  for (const stop of match[2].matchAll(stopPattern)) {
    stops.push({ color: stop[1], position: Number(stop[2]) });
  }
  return { type: 'gradient', angle: Number(match[1]), stops };
}

function decodeMesh(source: string): MeshFill | undefined {
  const match = source.match(/^mesh\(\s*(.*)\)\s*$/);
  if (!match) {
    return undefined;
  }

  const points: MeshPoint[] = [];
  const pointPattern = new RegExp(`(${COLOR_TOKEN_PATTERN})\\s+([-\\d.]+)\\s*,\\s*([-\\d.]+)`, 'g');
  let index = 0;
  for (const point of match[1].matchAll(pointPattern)) {
    points.push({
      id: `mp-${Date.now()}-${index++}`,
      color: point[1],
      x: Number(point[2]),
      y: Number(point[3]),
    });
  }
  return { type: 'mesh', points };
}

export function decodeColor(source?: string): DecodedColor | undefined {
  if (source === undefined || source === null || source === '') {
    return undefined;
  }
  return decodeGradient(source) ?? decodeMesh(source) ?? source;
}
