import type { LinkReconnectEvent } from '../../events';
import { setEndpoint } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyLinkReconnectChange(sfl: string, event: LinkReconnectEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setEndpoint(lines, range, {
    end: event.end,
    targetName: event.target.id,
    side: event.side,
    fraction: event.fraction,
  });
  return lines.join('\n');
}
