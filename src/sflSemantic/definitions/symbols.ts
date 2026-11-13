import { combineOutlines, type Outline, type Ring, ringArea } from '../../model/outline';
import { flattenPath } from '../../model/path';
import type { SflBlock } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import { asNumber, asString, tupleValues } from '../ast/valueAccess';
import type { SflSymbolDefinition } from '../canvasObjects/types';

type SymbolDefinition = SflSymbolDefinition;

function readSymbolPoints(block: SflBlock): { points: Array<[number, number]>; tensions: Array<number | undefined> } {
  const value = directProperties(block).get('points');
  const points: Array<[number, number]> = [];
  const tensions: Array<number | undefined> = [];
  if (value?.type !== 'list') {
    return { points, tensions };
  }
  for (const item of value.values) {
    if (item.type !== 'list' || item.values.length < 2) {
      continue;
    }
    const x = asNumber(item.values[0]);
    const y = asNumber(item.values[1]);
    if (x === undefined || y === undefined) {
      continue;
    }
    points.push([x, y]);
    tensions.push(item.values[2] === undefined ? undefined : asNumber(item.values[2]));
  }
  return { points, tensions };
}

function readSymbolPorts(block: SflBlock): SymbolDefinition['ports'] {
  const ports = childBlocks(block)
    .filter(child => child.kind === 'Port')
    .flatMap(port => {
      const position = tupleValues(directProperties(port).get('at'));
      if (typeof position?.[0] !== 'number' || typeof position[1] !== 'number') {
        return [];
      }

      return [{ name: port.name, at: [position[0], position[1]] as [number, number] }];
    });
  return ports.length > 0 ? ports : undefined;
}

type Lookup = (name: string) => SymbolDefinition | undefined;

function flatRing(points: Array<[number, number]>, tensions: Array<number | undefined>, tension: number): Ring {
  const curve = points.map(([x, y], index) =>
    tensions[index] === undefined ? { x, y } : { x, y, tension: tensions[index] },
  );
  return flattenPath({ points: curve, tension, closed: true }).map(point => [point.x, point.y]);
}

const ringsOf = (symbol: SymbolDefinition): Outline =>
  symbol.rings ?? [flatRing(symbol.points, symbol.pointTensions ?? [], symbol.tension ?? 0)];

// What a Cut or an Add brings: its own points, or another symbol laid into a place of this one.
function childOutline(child: SflBlock, lookup: Lookup): Outline {
  const properties = directProperties(child);
  const name = asString(properties.get('symbol'));
  if (!name) {
    const { points, tensions } = readSymbolPoints(child);
    return points.length >= 3 ? [flatRing(points, tensions, asNumber(properties.get('tension')) ?? 0)] : [];
  }
  const other = lookup(name);
  if (!other) {
    return [];
  }
  const [x = 0, y = 0] = tupleValues(properties.get('at')) ?? [];
  const [width = 1, height = 1] = tupleValues(properties.get('size')) ?? [];
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return [];
  }
  return ringsOf(other).map(ring => ring.map(([px, py]) => [x + px * width, y + py * height] as [number, number]));
}

export function readSymbolDefinition(block: SflBlock, lookup: Lookup = () => undefined): SymbolDefinition | undefined {
  const { points, tensions } = readSymbolPoints(block);
  if (points.length < 2) {
    return undefined;
  }

  const plain: SymbolDefinition = {
    name: block.name,
    points,
    pointTensions: tensions.some(tension => tension !== undefined) ? tensions : undefined,
    tension: asNumber(directProperties(block).get('tension')),
    ports: readSymbolPorts(block),
  };
  const changes = childBlocks(block).filter(child => child.kind === 'Cut' || child.kind === 'Add');
  if (changes.length === 0 || points.length < 3) {
    return plain;
  }
  let outline = ringsOf(plain);
  for (const child of changes) {
    const other = childOutline(child, lookup);
    if (other.length > 0) {
      outline = combineOutlines(outline, other, child.kind === 'Cut' ? 'cut' : 'add');
    }
  }
  if (outline.length === 0) {
    return undefined;
  }
  const largest = outline.reduce((best, ring) => (Math.abs(ringArea(ring)) > Math.abs(ringArea(best)) ? ring : best));
  return { name: block.name, points: largest, ports: plain.ports, rings: outline };
}
