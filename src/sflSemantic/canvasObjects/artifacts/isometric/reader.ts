import { flattenPath, type PathPoint } from '../../../../model/path';
import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { SflSymbolDefinition } from '../../types';
import type { SflIsometricData } from './types';

type Properties = Map<string, SflValue>;

function readFootprintPoint(value: SflValue): PathPoint[] {
  if (value.type !== 'list' || value.values.length < 2) {
    return [];
  }
  const x = asNumber(value.values[0]);
  const y = asNumber(value.values[1]);
  const tension = value.values[2] === undefined ? undefined : asNumber(value.values[2]);
  if (x === undefined || y === undefined) {
    return [];
  }
  return [tension === undefined ? { x, y } : { x, y, tension }];
}

function asPolygon(points: PathPoint[], tension: number): Array<[number, number]> | undefined {
  const flat = flattenPath({ points, tension, closed: true });
  return flat.length >= 3 ? flat.map(point => [point.x, point.y] as [number, number]) : undefined;
}

function readFootprint(
  value: SflValue | undefined,
  symbolDefs: Map<string, SflSymbolDefinition>,
): Array<[number, number]> | undefined {
  if (value?.type === 'list') {
    return asPolygon(value.values.flatMap(readFootprintPoint), 0);
  }
  const name = asString(value);
  const definition = name ? symbolDefs.get(name) : undefined;
  if (!definition) {
    return undefined;
  }
  const points = definition.points.map(([x, y], index) => {
    const tension = definition.pointTensions?.[index];
    return tension === undefined ? { x, y } : { x, y, tension };
  });
  return asPolygon(points, definition.tension ?? 0);
}

export function readIsometric(
  properties: Properties,
  depth: number,
  symbolDefs: Map<string, SflSymbolDefinition>,
): SflIsometricData {
  return {
    depth,
    icon: asString(properties.get('icon')),
    footprint: readFootprint(properties.get('symbol'), symbolDefs),
    form: asString(properties.get('shape')) === 'sphere' ? 'sphere' : 'box',
  };
}
