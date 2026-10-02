import type { SflBlock } from '../../../../sfl/ast';
import { contentChildren, directProperties } from '../../../ast/blockEntries';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { ChartData } from './types';
import { numberList } from './values';

export function readChartRules(block: SflBlock): ChartData['rules'] {
  return contentChildren(block)
    .filter(child => child.kind === 'Rule')
    .map(rule => {
      const properties = directProperties(rule);
      return {
        id: rule.name,
        at: asNumber(properties.get('at')) ?? 0,
        text: asString(properties.get('text')),
        color: asString(properties.get('color')),
        strokeWidth: asNumber(properties.get('strokeWidth')),
        dash: numberList(properties.get('dash')),
      };
    });
}
