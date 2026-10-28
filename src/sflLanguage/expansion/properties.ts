import type { SflBlock, SflValue } from '../ast';

// What a block says in a property of its own, as the grid of a Repeat or the place of a Use.
export function propertyOf(block: SflBlock, key: string): SflValue | undefined {
  for (const entry of block.entries) {
    if (entry.type === 'property' && entry.property.key === key) {
      return entry.property.value;
    }
  }
  return undefined;
}

export function numbersOf(block: SflBlock, key: string): number[] | undefined {
  for (const entry of block.entries) {
    if (entry.type === 'property' && entry.property.key === key) {
      const value = entry.property.value;
      if (value.type === 'number') {
        return [value.value];
      }
      if (value.type === 'tuple') {
        return value.values;
      }
    }
  }
  return undefined;
}
