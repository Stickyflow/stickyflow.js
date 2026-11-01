import type { SflBlock, SflValue } from '../ast';
import { resolveNumeric } from './evaluation';
import { fail, type Scope } from './scope';

// What a block says in a property of its own, as the grid of a Repeat or the place of a Use.
export function propertyOf(block: SflBlock, key: string): SflValue | undefined {
  for (const entry of block.entries) {
    if (entry.type === 'property' && entry.property.key === key) {
      return entry.property.value;
    }
  }
  return undefined;
}

// The numbers of a property of a Repeat or a Use: written out, or computed from the Parameters.
export function numbersOf(scope: Scope, block: SflBlock, key: string): number[] | undefined {
  const written = propertyOf(block, key);
  if (!written) {
    return undefined;
  }
  const value = resolveNumeric(scope, written);
  if (value.type === 'number') {
    return [value.value];
  }
  if (value.type === 'tuple') {
    return value.values;
  }
  fail(scope, `${key} needs a number`);
}
