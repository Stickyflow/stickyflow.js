import type { SflBlock, SflValue } from '../../ast';

export function directProperties(block: SflBlock): Map<string, SflValue> {
  const properties = new Map<string, SflValue>();
  for (const entry of block.entries) {
    if (entry.type === 'property') {
      properties.set(entry.property.key, entry.property.value);
    }
  }
  return properties;
}

export function styleProperties(block: SflBlock): Map<string, SflValue> {
  const properties = new Map<string, SflValue>();
  for (const entry of block.entries) {
    if (entry.type === 'style') {
      for (const property of entry.style.properties) {
        properties.set(property.key, property.value);
      }
    }
  }
  return properties;
}

export function layoutProperties(block: SflBlock): Map<string, SflValue> {
  const properties = new Map<string, SflValue>();
  for (const entry of block.entries) {
    if (entry.type === 'layout') {
      for (const property of entry.layout.properties) {
        properties.set(property.key, property.value);
      }
    }
  }
  return properties;
}

export function childBlocks(block: SflBlock): SflBlock[] {
  return block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []));
}

function dataEntryBlock(block: SflBlock): SflBlock | undefined {
  for (const entry of block.entries) {
    if (entry.type === 'data') {
      return entry.data;
    }
  }
  return undefined;
}

export function contentChildren(block: SflBlock): SflBlock[] {
  const data = dataEntryBlock(block);
  return data ? [...childBlocks(block), ...childBlocks(data)] : childBlocks(block);
}

export function contentProperty(block: SflBlock, key: string): SflValue | undefined {
  const direct = directProperties(block).get(key);
  if (direct !== undefined) {
    return direct;
  }
  const data = dataEntryBlock(block);
  return data ? directProperties(data).get(key) : undefined;
}
