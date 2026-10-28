import type { SflCanvasObject } from '../../types';
import type { SflSwimlaneData } from './types';

export type SflSwimlaneObject = SflCanvasObject & {
  objectType: 'swimlane';
  swimlane: SflSwimlaneData;
};

export function isSwimlaneObject(canvasObject: SflCanvasObject): canvasObject is SflSwimlaneObject {
  return canvasObject.objectType === 'swimlane' && canvasObject.swimlane !== undefined;
}
