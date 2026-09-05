import { resolveOwner } from '../../domContract';
import type { Viewer } from '../../viewer';
import { hasEditableGeometry } from '../geometryRoles';
import { captureDraggedEntities } from './entityCapture';
import { captureInternalLinks } from './internalLinkCapture';
import { selectedMoveGroup } from './selection';
import type { MoveDragState } from './types';

function isChartValueMark(target: Element | null): boolean {
  return target?.closest?.('[data-sf-value-index]') != null;
}

export function createMoveDragState(
  viewer: Viewer,
  event: PointerEvent,
  startUser: { x: number; y: number },
): MoveDragState | null {
  const owner = resolveOwner(event.target as Element | null);
  if (!hasEditableGeometry(owner) || isChartValueMark(event.target as Element | null)) {
    return null;
  }

  const group = selectedMoveGroup(viewer, owner);
  const groupIds = new Set(group.map(member => member.id));
  const entities = captureDraggedEntities(viewer.svg, group, groupIds);
  if (!entities.length) {
    return null;
  }

  (event.target as Element).setPointerCapture?.(event.pointerId);
  return {
    entities,
    internalLinks: captureInternalLinks(viewer.svg, groupIds),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    startUser,
    moved: false,
  };
}

export type { DraggedEntity, MoveDragState } from './types';
