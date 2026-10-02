import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';

export function numberList(value?: SflValue): number[] | undefined {
  if (value?.type !== 'list') {
    return undefined;
  }
  const numbers = value.values.flatMap(item => {
    const number = asNumber(item);
    return number === undefined ? [] : [number];
  });
  return numbers.length > 0 ? numbers : undefined;
}

export function stringList(value?: SflValue): string[] | undefined {
  if (value?.type !== 'list') {
    return undefined;
  }
  return value.values.flatMap(item => {
    const text = asString(item);
    return text === undefined ? [] : [text];
  });
}

export function readBoolean(value?: SflValue): boolean | undefined {
  const text = asString(value);
  if (text === undefined) {
    return undefined;
  }
  return text === 'true';
}
