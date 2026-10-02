import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { PathPointChangeEvent } from '../../events';
import { replacePropertyValue } from '../edits/propertyValues';
import { findOwnerBlock } from '../scanner';
import { formatPoints, pointsSpan } from './pathPoints';

export function applyPathPointChange(sfl: string, event: PathPointChangeEvent): string {
  const entities = sflToCanvasState(sfl).canvasObjects;
  const entity = entities.find(candidate => candidate.id === event.owner.id);
  if (!entity) {
    return sfl;
  }
  const parent = entity.parentFrameId ? entities.find(candidate => candidate.id === entity.parentFrameId) : undefined;
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
