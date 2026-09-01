import type { SflBlock, SflValue } from '../ast';
import { directProperties } from './blockEntries';
import type { BlockDefinitions } from './definitions';

export type ResolvedDefinitions = Map<string, Map<string, SflValue>>;

export function resolveDefinitionInheritance(
  definitions: BlockDefinitions,
  parentName: (block: SflBlock) => string | undefined,
): ResolvedDefinitions {
  const resolved: ResolvedDefinitions = new Map();

  const resolve = (name: string, seen = new Set<string>()): Map<string, SflValue> => {
    const cached = resolved.get(name);
    if (cached) {
      return cached;
    }

    const block = definitions.get(name);
    if (!block || seen.has(name)) {
      return new Map();
    }

    const values = new Map<string, SflValue>();
    const parent = parentName(block);
    if (parent) {
      for (const [key, value] of resolve(parent, new Set([...seen, name]))) {
        values.set(key, value);
      }
    }
    for (const [key, value] of directProperties(block)) {
      values.set(key, value);
    }
    resolved.set(name, values);
    return values;
  };

  for (const name of definitions.keys()) {
    resolve(name);
  }
  return resolved;
}
