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
  const kept = canvasObject.objectType === 'path' ? canvasObject.path?.points : undefined;
  const sameCount = kept?.length === event.points.length;
  const relative = event.points.map((point, index) => {
    const tension = sameCount ? kept?.[index]?.tension : undefined;
    const moved = { x: point.x - origin.x, y: point.y - origin.y };
    return tension === undefined ? moved : { ...moved, tension };
  });
  replacePropertyValue(lines, span, formatPoints(relative));
  return lines.join('\n');
}
