import type { SflValue } from '../../ast';
import type { ResolvedCanvasObject } from '../types';
import { asNumber, asString } from '../valueAccess';

type Properties = Map<string, SflValue>;

export function readSwimlane(p: Properties): ResolvedCanvasObject['swimlane'] {
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
  const swimlaneData: ResolvedCanvasObject['swimlane'] = { orientation, lanes };

  return swimlaneData;
}
