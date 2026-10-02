import type { SflValue } from '../../sflLanguage/ast';

export function asString(value?: SflValue): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.type === 'string') {
    return value.value;
  }
  if (value.type === 'ident') {
    return value.segments.join('.');
  }
  if (value.type === 'number') {
    return String(value.value);
  }
  return undefined;
}

export function asNumber(value?: SflValue): number | undefined {
  return value?.type === 'number' ? value.value : undefined;
}

export function tupleValues(value?: SflValue): number[] | undefined {
  return value?.type === 'tuple' ? value.values : undefined;
}

export function listNumbers(value?: SflValue): number[] | undefined {
  return value?.type === 'list'
    ? value.values.flatMap(item => (item.type === 'number' ? [item.value] : []))
    : undefined;
}
