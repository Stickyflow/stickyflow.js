import type { SflBlock } from '../ast';
import type { EntityReaderContext } from './entityReader';
import { asString } from './valueAccess';

function netMembers(block: SflBlock, context: EntityReaderContext): string[][] {
  const membersValue = context.mergedProps(block).get('members');
  return membersValue?.type === 'list'
    ? membersValue.values.flatMap(value => (value.type === 'ident' ? [value.segments] : []))
    : [];
}

function netLink(block: SflBlock, from: string[], to: string[], index: number, text?: string): SflBlock {
  const entries: SflBlock['entries'] = [
    { type: 'property', property: { key: 'from', value: { type: 'endpoint', segments: from } } },
    { type: 'property', property: { key: 'to', value: { type: 'endpoint', segments: to } } },
  ];
  if (text) {
    entries.push({
      type: 'property',
      property: { key: 'text', value: { type: 'string', value: text } },
    });
  }
  return { kind: 'Link', name: `${block.name}_${index + 1}`, composition: [], entries };
}

export function expandNetLinks(block: SflBlock, context: EntityReaderContext): SflBlock[] {
  const members = netMembers(block, context);
  if (members.length < 2) {
    return [];
  }

  const text = asString(context.mergedProps(block).get('text'));
  return members.slice(1).map((member, index) => netLink(block, members[0], member, index, text));
}
