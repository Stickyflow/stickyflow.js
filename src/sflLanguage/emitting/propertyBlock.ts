import type { SflBinding, SflProperty } from '../ast';
import { emitBinding } from './expressions';
import { compareLayoutProps, compareStyleProps } from './propertyOrder';
import { emitProperty } from './values';

const INDENT = '  ';

export function emitPropertyBlock(
  name: 'layout' | 'style',
  properties: SflProperty[],
  depth: number,
  bindings: SflBinding[] = [],
): string {
  const pad = INDENT.repeat(depth);
  const innerPad = INDENT.repeat(depth + 1);
  const compare = name === 'layout' ? compareLayoutProps : compareStyleProps;
  const lines = [...properties]
    .sort((left, right) => compare(left.key, right.key))
    .map(property => `${innerPad}${emitProperty(property)}`);
  lines.push(...bindings.map(binding => `${innerPad}${emitBinding(binding)}`));

  if (!lines.length) {
    return `${pad}${name} {\n${pad}}`;
  }

  return `${pad}${name} {\n${lines.join('\n')}\n${pad}}`;
}
