import type { SflBlock, SflEntry, SflProperty } from '../ast';
import { resolveValue } from './evaluation';
import type { Scope } from './scope';

function propertiesOf(scope: Scope, properties: SflProperty[]): SflProperty[] {
  return properties.map(property => ({ key: property.key, value: resolveValue(scope, property.value) }));
}

function entryOf(scope: Scope, entry: SflEntry, rename: (name: string) => string): SflEntry {
  switch (entry.type) {
    case 'property':
      return {
        type: 'property',
        property: { key: entry.property.key, value: resolveValue(scope, entry.property.value) },
      };
    case 'layout':
      return { type: 'layout', layout: { properties: propertiesOf(scope, entry.layout.properties) } };
    case 'style':
      return { type: 'style', style: { ...entry.style, properties: propertiesOf(scope, entry.style.properties) } };
    case 'block':
      return { type: 'block', block: instance(scope, entry.block, rename) };
    default:
      return entry;
  }
}

// A copy of a block with its computed values worked out and its name, and the names of the blocks in it, changed by `rename`.
export function instance(scope: Scope, block: SflBlock, rename: (name: string) => string): SflBlock {
  return {
    ...block,
    name: rename(block.name),
    entries: block.entries.map(entry => entryOf(scope, entry, rename)),
  };
}
