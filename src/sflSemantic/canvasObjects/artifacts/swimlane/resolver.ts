import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import { readSwimlane } from './reader';
import type { SflSwimlaneObject } from './types';

export function resolveSwimlaneObject(base: SflCanvasObjectBase, properties: Map<string, SflValue>): SflSwimlaneObject {
  return {
    ...base,
    objectType: 'swimlane',
    swimlane: readSwimlane(properties),
  };
}
