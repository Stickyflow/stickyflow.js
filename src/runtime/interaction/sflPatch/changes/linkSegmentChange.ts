import type { LinkSegmentChangeEvent } from '../../events';
import { childIndent } from '../blockInsert';
import { insertDirectProperty, replacePropertyValue } from '../edits/propertyValues';
import { round1 } from '../format';
import { findDirectProperty } from '../scan/properties';
import { findOwnerBlock } from '../scanner';

const SEGMENT_SLOTS = 4;

export function applyLinkSegmentChange(sfl: string, event: LinkSegmentChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  const existing = findDirectProperty(lines, range, 'segments');
  const offsets = Array.from({ length: SEGMENT_SLOTS }, () => 0);
  if (existing !== null && existing.line === existing.endLine) {
    const current = lines[existing.line].slice(existing.start, existing.end).match(/-?\d+(?:\.\d+)?/g) ?? [];
    current.slice(0, SEGMENT_SLOTS).forEach((value, index) => {
      offsets[index] = Number(value);
    });
  }
  if (event.index >= 0 && event.index < SEGMENT_SLOTS) {
    offsets[event.index] = event.offset;
  }
  const value = `[${offsets.map(round1).join(', ')}]`;
  if (existing !== null) {
    replacePropertyValue(lines, existing, value);
  } else {
    insertDirectProperty(lines, range, childIndent(lines, range), 'segments', value);
  }
  return lines.join('\n');
}
