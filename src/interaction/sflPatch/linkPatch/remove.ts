import { findOwnerBlock } from '../scanner';

export function removeLink(sfl: string, id: string): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, id);
  if (!range) {
    return sfl;
  }

  lines.splice(range.start, range.end - range.start + 1);
  return lines.join('\n');
}
