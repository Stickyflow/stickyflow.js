import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import type { SflSwimlaneObject } from './object';
import { readSwimlane } from './reader';

export function resolveSwimlaneObject(base: SflCanvasObjectBase, properties: Map<string, SflValue>): SflSwimlaneObject {
  return {
    ...base,
    objectType: 'swimlane',
    swimlane: readSwimlane(properties),
  };
}
