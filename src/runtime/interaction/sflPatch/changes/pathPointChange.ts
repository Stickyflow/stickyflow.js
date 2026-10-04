import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { PathPointChangeEvent } from '../../events';
import { replacePropertyValue } from '../edits/propertyValues';
import { findOwnerBlock } from '../scanner';
import { formatPoints, pointsSpan } from './pathPoints';

export function applyPathPointChange(sfl: string, event: PathPointChangeEvent): string {
  const canvasObjects = sflToCanvasState(sfl).canvasObjects;
  const canvasObject = canvasObjects.find(candidate => candidate.id === event.owner.id);
  if (!canvasObject) {
    return sfl;
  }
  const parent = canvasObject.parentFrameId
    ? canvasObjects.find(candidate => candidate.id === canvasObject.parentFrameId)
    : undefined;
  const origin = parent ? { x: parent.x, y: parent.y } : { x: 0, y: 0 };

  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  const span = pointsSpan(lines, range);
  if (!span) {
    return sfl;
  }
  const relative = event.points.map(point => ({ x: point.x - origin.x, y: point.y - origin.y }));
  replacePropertyValue(lines, span, formatPoints(relative));
  return lines.join('\n');
}
