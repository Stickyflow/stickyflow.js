import type { SflProperty, SflValue } from '../ast';
import { emitExpression } from './expressions';
import { emitString, formatNumber } from './literals';

export function emitValue(value: SflValue): string {
  switch (value.type) {
    case 'string':
      return emitString(value.value);
    case 'number':
      return formatNumber(value.value);
    case 'tuple':
      return value.values.map(formatNumber).join(', ');
    case 'list':
      return `[${value.values.map(emitValue).join(', ')}]`;
    case 'ident':
      return value.segments.join('.');
    case 'expr':
      return value.items.map(item => emitExpression(item)).join(', ');
    case 'endpoint': {
      let output = value.segments.join('.');
      if (value.side) {
        output += `, ${value.side}`;
        if (value.fraction !== undefined) {
          output += ` (${formatNumber(value.fraction)})`;
        }
      }
      return output;
    }
  }
}

export const emitProperty = (property: SflProperty): string => `${property.key}: ${emitValue(property.value)}`;
