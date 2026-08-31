import type { SflBlock, SflValue } from '../../ast';
import type { SflEntityOut } from '../types';
import { asNumber, asString, childBlocks, directProps, numStr } from '../readers';

type Properties = Map<string, SflValue>;
type LayoutProp = (block: SflBlock, key: string) => SflValue | undefined;

export function readSwimlane(p: Properties): SflEntityOut['swimlane'] {
  let swimlaneData: SflEntityOut['swimlane'];
  
  // orientation + lanes are the swimlane-specific structural payload the
  // canonical emitter writes (canvasStateToSfl): `orientation: horizontal`
  // and `lanes: [[label, size, color?], …]` as a native nested list. Parse
  // the list into structured lanes so the render pipeline gets real lanes
  // instead of collapsing the whole thing into a plain frame.
  const orientation = asString(p.get('orientation')) === 'vertical' ? 'vertical' : 'horizontal';
  const lanesValue = p.get('lanes');
  const lanes = lanesValue?.type === 'list'
    ? lanesValue.values.flatMap((value, index) => {
        if (value.type !== 'list') return [];
        const label = asString(value.values[0]);
        const size = asNumber(value.values[1]);
        if (label === undefined || size === undefined) return [];
        const color = asString(value.values[2]);
        return [{ id: `lane-${index + 1}`, label, size, ...(color ? { color } : {}) }];
      })
    : [];
  swimlaneData = { orientation, lanes };
    
  return swimlaneData;
}

