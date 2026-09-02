import { COLOR_TOKEN_PATTERN } from './colorToken';

export interface RampStop {
  position: number;
  color: string;
}

export interface DecodedRamp {
  type: 'ramp';
  stops: RampStop[];
}

export function decodeRamp(source?: string): DecodedRamp | undefined {
  if (!source) {
    return undefined;
  }
  const match = source.match(/^ramp\(\s*(.*)\)\s*$/);
  if (!match) {
    return undefined;
  }

  const stops: RampStop[] = [];
  const stopPattern = new RegExp(`(${COLOR_TOKEN_PATTERN})\\s+([-\\d.]+)`, 'g');
  for (const stop of match[1].matchAll(stopPattern)) {
    stops.push({ color: stop[1], position: Number(stop[2]) });
  }
  return { type: 'ramp', stops };
}
