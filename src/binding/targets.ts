import type { BlockKind } from '../sflLanguage/ast';
import type { BindingType } from './types';

// The properties of each block kind that can be bound, and the type they expect.
export const BINDABLE_PROPERTIES: Partial<Record<BlockKind, Record<string, BindingType>>> = {
  Chart: { category: { list: 'string' }, value: { list: 'number' }, text: 'string' },
  Shape: { text: 'string' },
  Widget: { value: 'number' },
};
