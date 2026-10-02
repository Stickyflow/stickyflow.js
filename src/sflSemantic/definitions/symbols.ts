import type { SflBlock } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import { asNumber, tupleValues } from '../ast/valueAccess';
import type { SflEntityOut } from '../canvasObjects/types';

type SymbolDefinition = NonNullable<SflEntityOut['symbol']>;

function readSymbolPoints(block: SflBlock): Array<[number, number]> {
  const value = directProperties(block).get('points');
  if (value?.type !== 'list') {
    return [];
  }

  return value.values.flatMap(item => {
    if (item.type !== 'list' || item.values.length < 2) {
      return [];
    }

    const x = asNumber(item.values[0]);
    const y = asNumber(item.values[1]);
    return x === undefined || y === undefined ? [] : [[x, y] as [number, number]];
  });
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
  const points = readSymbolPoints(block);
  if (points.length < 2) {
    return undefined;
  }

  return {
    name: block.name,
    points,
    tension: asNumber(directProperties(block).get('tension')),
    ports: readSymbolPorts(block),
  };
}
