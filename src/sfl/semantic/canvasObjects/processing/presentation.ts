import type { SflValue } from '../../../ast';
import { asString } from '../../ast/valueAccess';

const STRUCTURAL_PROPERTIES = new Set(['id', 'kind', 'text', 'shape', 'parent', 'order', 'orientation', 'lanes']);

export function readCanvasObjectPresentation(properties: Map<string, SflValue>): Record<string, string> {
  const presentation: Record<string, string> = {};

  for (const [key, value] of properties) {
    if (STRUCTURAL_PROPERTIES.has(key)) {
      continue;
    }

    const text = asString(value);
    if (text !== undefined) {
      presentation[key] = text;
    }
  }

  return presentation;
}
