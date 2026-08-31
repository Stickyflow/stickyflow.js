import type { SflBlock, SflValue, Side } from '../ast';
import type { EntityReaderContext } from './entityReader';
import type { SflEntityOut, SflLinkOut } from './types';
import { asNumber, asString, childBlocks, directProps, listNumbers } from './readers';

export function readLinks(
  model: SflBlock | undefined,
  linkBlocks: SflBlock[],
  entities: SflEntityOut[],
  context: EntityReaderContext,
): SflLinkOut[] {
  const idByName = new Map<string, string>();
  const indexNames = (blocks: SflBlock[]): void => {
    for (const block of blocks) {
      if (['Entity', 'Container', 'Table', 'Path', 'Chart'].includes(block.kind)) {
        idByName.set(block.name, asString(directProps(block).get('id')) ?? block.name);
      }
      indexNames(childBlocks(block));
    }
  };
  if (model) indexNames(childBlocks(model));

  const entityById = new Map(entities.map(entity => [entity.id, entity]));
  const endpoint = (value?: SflValue): { id?: string; side?: Side; fraction?: number; port?: string } => {
    if (!value || value.type !== 'endpoint') return {};
    const last = value.segments[value.segments.length - 1];
    if (value.segments.length >= 2) {
      const entityName = value.segments[value.segments.length - 2];
      const entityId = idByName.get(entityName);
      const entity = entityId ? entityById.get(entityId) : undefined;
      if (entity?.symbol?.ports?.some(port => port.name === last)) return { id: entityId, port: last };
    }
    return { id: idByName.get(last) ?? last, side: value.side, fraction: value.fraction };
  };

  return linkBlocks.map(block => {
    const properties = context.mergedProps(block);
    const from = endpoint(properties.get('from'));
    const to = endpoint(properties.get('to'));
    const structural = new Set(['id', 'from', 'to', 'text', 'order', 'segments']);
    const props: Record<string, string> = {};
    for (const [key, value] of properties) {
      if (structural.has(key)) continue;
      const text = asString(value);
      if (text !== undefined) props[key] = text;
    }
    return {
      id: asString(properties.get('id')) ?? block.name,
      fromId: from.id,
      toId: to.id,
      text: asString(properties.get('text')),
      fromSide: from.side,
      fromFraction: from.fraction,
      toSide: to.side,
      toFraction: to.fraction,
      fromPort: from.port,
      toPort: to.port,
      order: asNumber(properties.get('order')),
      segments: listNumbers(properties.get('segments')),
      props,
    };
  });
}

