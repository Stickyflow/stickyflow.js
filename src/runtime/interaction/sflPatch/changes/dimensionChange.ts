import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { DimensionChangeEvent } from '../../events';
import { round1 } from '../format';
import { applyPropertyChange } from './propertyChange';

export function applyDimensionChange(sfl: string, event: DimensionChangeEvent): string {
  const objects = sflToCanvasState(sfl).canvasObjects;
  const object = objects.find(candidate => candidate.id === event.owner.id);
  const parent = object?.parentFrameId ? objects.find(candidate => candidate.id === object.parentFrameId) : undefined;
  const tuple = (point: { x: number; y: number }) =>
    `${round1(point.x - (parent?.x ?? 0))}, ${round1(point.y - (parent?.y ?? 0))}`;
  const set = (text: string, path: string, value: string | number) =>
    applyPropertyChange(text, { owner: event.owner, path, value, quote: false });
  return set(set(set(sfl, 'start', tuple(event.start)), 'end', tuple(event.end)), 'offset', round1(event.offset));
}
