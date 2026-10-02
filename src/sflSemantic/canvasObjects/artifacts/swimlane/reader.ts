import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { SflCanvasObject } from '../../types';

type Properties = Map<string, SflValue>;

export function readSwimlane(p: Properties): SflCanvasObject['swimlane'] {
  const orientation = asString(p.get('orientation')) === 'vertical' ? 'vertical' : 'horizontal';
  const lanesValue = p.get('lanes');
  const lanes =
    lanesValue?.type === 'list'
      ? lanesValue.values.flatMap((value, index) => {
          if (value.type !== 'list') {
            return [];
          }
          const label = asString(value.values[0]);
          const size = asNumber(value.values[1]);
          if (label === undefined || size === undefined) {
            return [];
          }
          const color = asString(value.values[2]);
          return [{ id: `lane-${index + 1}`, label, size, ...(color ? { color } : {}) }];
        })
      : [];
  const swimlaneData: SflCanvasObject['swimlane'] = { orientation, lanes };

  return swimlaneData;
}
