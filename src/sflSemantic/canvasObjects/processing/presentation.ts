import type { SflValue } from '../../../sflLanguage/ast';
import { asString, listNumbers, tupleValues } from '../../ast/valueAccess';

const STRUCTURAL_PROPERTIES = new Set(['id', 'kind', 'text', 'shape', 'parent', 'order', 'orientation', 'lanes']);

// Numbers that belong together and are read as one value, written with commas.
const TUPLE_PROPERTIES = new Set(['crop', 'imageSize']);
const LIST_PROPERTIES = new Set(['cornerRadii']);

export function readCanvasObjectPresentation(properties: Map<string, SflValue>): Record<string, string> {
  const presentation: Record<string, string> = {};

  for (const [key, value] of properties) {
    if (STRUCTURAL_PROPERTIES.has(key)) {
      continue;
    }

    const text = TUPLE_PROPERTIES.has(key)
      ? tupleValues(value)?.join(',')
      : LIST_PROPERTIES.has(key)
        ? listNumbers(value)?.join(',')
        : asString(value);
    if (text !== undefined) {
      presentation[key] = text;
    }
  }

  return presentation;
}
