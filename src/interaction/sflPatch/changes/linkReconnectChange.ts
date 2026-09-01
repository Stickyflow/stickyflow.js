import type { LinkReconnectEvent } from '../../events';
import { setEndpoint } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyLinkReconnectChange(sfl: string, event: LinkReconnectEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setEndpoint(lines, range, event.end, event.target.id, event.side, event.fraction);
  return lines.join('\n');
}
