import type { SflBlock } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import { asNumber, tupleValues } from '../ast/valueAccess';
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

export function readSymbolDefinition(block: SflBlock): SymbolDefinition | undefined {
  const { points, tensions } = readSymbolPoints(block);
  if (points.length < 2) {
    return undefined;
  }

  return {
    name: block.name,
    points,
    pointTensions: tensions.some(tension => tension !== undefined) ? tensions : undefined,
    tension: asNumber(directProperties(block).get('tension')),
    ports: readSymbolPorts(block),
  };
}
