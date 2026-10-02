import type { SflCanvasObject } from '../../types';

export interface SflSwimlaneData {
  orientation: 'horizontal' | 'vertical';
  lanes: Array<{ id: string; label: string; size: number; color?: string }>;
}

export type SflSwimlaneObject = SflCanvasObject & {
  objectType: 'swimlane';
  swimlane: SflSwimlaneData;
};

export function isSwimlaneObject(canvasObject: SflCanvasObject): canvasObject is SflSwimlaneObject {
  return canvasObject.objectType === 'swimlane' && canvasObject.swimlane !== undefined;
}
