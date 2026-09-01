import type { SflBlock } from '../../../ast';
import { asNumber, asString, childBlocks, directProps } from '../../readers';
import type { ChartData } from './types';
import { numberList } from './values';

export function readChartRules(block: SflBlock): ChartData['rules'] {
  return childBlocks(block)
    .filter(child => child.kind === 'Rule')
    .map(rule => {
      const properties = directProps(rule);
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
