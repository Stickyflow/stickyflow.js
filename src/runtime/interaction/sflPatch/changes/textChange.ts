import type { TextChangeEvent } from '../../events';
import { setOrInsertText } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyTextChange(sfl: string, event: TextChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setOrInsertText(lines, range, event.text);
  return lines.join('\n');
}
