import { round2 } from '../format';
import type { LinkEndpointTextOptions } from './types';

export function formatLinkEndpoint(options: LinkEndpointTextOptions): string {
  if (!options.side) {
    return options.id;
  }

  const fraction = options.fraction !== undefined ? ` (${round2(options.fraction)})` : '';
  return `${options.id}, ${options.side}${fraction}`;
}
