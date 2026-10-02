import type { SflValue } from '../../../ast';
import { asString } from '../../valueAccess';

const STRUCTURAL_LINK_PROPERTIES = new Set(['id', 'from', 'to', 'text', 'order', 'segments']);

export function readLinkPresentation(properties: Map<string, SflValue>): Record<string, string> {
  const presentation: Record<string, string> = {};

  for (const [key, value] of properties) {
    if (STRUCTURAL_LINK_PROPERTIES.has(key)) {
      continue;
    }

    const text = asString(value);
    if (text !== undefined) {
      presentation[key] = text;
    }
  }

  return presentation;
}
