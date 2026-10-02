import type { SflBlock, SflValue } from '../../sflLanguage/ast';
import { directProperties } from '../ast/blockEntries';
import type { BlockDefinitions } from './collection';

export type ResolvedDefinitions = Map<string, Map<string, SflValue>>;
type ParentDefinitionName = (block: SflBlock) => string | undefined;

export function resolveDefinitionInheritance(
  definitions: BlockDefinitions,
  parentName: ParentDefinitionName,
): ResolvedDefinitions {
  return new DefinitionInheritanceResolver(definitions, parentName).resolveAll();
}

class DefinitionInheritanceResolver {
  readonly #definitions: BlockDefinitions;
  readonly #parentName: ParentDefinitionName;
  readonly #resolved: ResolvedDefinitions = new Map();

  constructor(definitions: BlockDefinitions, parentName: ParentDefinitionName) {
    this.#definitions = definitions;
    this.#parentName = parentName;
  }

  resolveAll(): ResolvedDefinitions {
    for (const name of this.#definitions.keys()) {
      this.#resolveDefinition(name, new Set());
    }
    return this.#resolved;
  }

  #resolveDefinition(name: string, ancestry: Set<string>): Map<string, SflValue> {
    const cached = this.#resolved.get(name);
    if (cached) {
      return cached;
    }

    const block = this.#definitions.get(name);
    if (!block || ancestry.has(name)) {
      return new Map();
    }

    const values = this.#inheritedProperties(block, new Set([...ancestry, name]));
    for (const [key, value] of directProperties(block)) {
      values.set(key, value);
    }
    this.#resolved.set(name, values);
    return values;
  }

  #inheritedProperties(block: SflBlock, ancestry: Set<string>): Map<string, SflValue> {
    const parent = this.#parentName(block);
    return parent ? new Map(this.#resolveDefinition(parent, ancestry)) : new Map();
  }
}
