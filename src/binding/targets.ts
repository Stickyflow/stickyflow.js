import type { BlockKind } from '../sflLanguage/ast';
import type { BindingType } from './types';

export const BINDABLE_PROPERTIES: Partial<Record<BlockKind, Record<string, BindingType>>> = {
  Chart: { categories: { list: 'string' }, text: 'string' },
  Series: { values: { list: 'number' }, label: 'string' },
  Shape: { text: 'string', fill: 'string', stroke: 'string', textColor: 'string', opacity: 'number' },
  Text: { text: 'string', textColor: 'string', opacity: 'number' },
  Widget: { value: 'number' },
};
