import type { SflBlock, SflDocument } from '../ast';

// The document with other values for some parameters, as a control or data set them. Only plain numbers are replaced; a parameter that is
// computed from others follows when the document is made.
export function withParameterValues(doc: SflDocument, values: ReadonlyMap<string, number>): SflDocument {
  const change = (blocks: SflBlock[]): SflBlock[] =>
    blocks.map(block => ({
      ...block,
      entries: block.entries.map(entry => {
        if (entry.type === 'block') {
          return { ...entry, block: change([entry.block])[0] };
        }
        if (block.kind !== 'Parameters' || entry.type !== 'property' || entry.property.value.type !== 'number') {
          return entry;
        }
        const value = values.get(`${block.name}.${entry.property.key}`);
        return value === undefined || !Number.isFinite(value)
          ? entry
          : { ...entry, property: { ...entry.property, value: { type: 'number' as const, value } } };
      }),
    }));
  return { ...doc, blocks: change(doc.blocks) };
}
