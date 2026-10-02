import { TABLE_COLUMN_DIVIDER_ATTR } from '../../../svg/domContract/attributes';
import { resolveOwner } from '../../dom';
import type { Viewer } from '../../viewer';
import { hasMovableGeometry } from '../geometryRoles';
import { captureDraggedCanvasObjects } from './canvasObjectCapture';
import { captureInternalLinks } from './internalLinkCapture';
import { selectedMoveGroup } from './selection';
import type { MoveDragState } from './types';

function isChartInteractiveMark(target: Element | null): boolean {
  return target?.closest?.('[data-sf-value-index], [data-sf-prop-kind="value"], [data-sf-mark]') != null;
}

function isColumnDividerTarget(target: Element | null): boolean {
  return target?.closest?.(`[${TABLE_COLUMN_DIVIDER_ATTR}]`) != null;
}

export function createMoveDragState(
  viewer: Viewer,
  event: PointerEvent,
  startUser: { x: number; y: number },
): MoveDragState | null {
  const target = event.target as Element | null;
  const owner = resolveOwner(target);
  if (!hasMovableGeometry(owner) || isChartInteractiveMark(target) || isColumnDividerTarget(target)) {
    return null;
  }

  const group = selectedMoveGroup(viewer, owner);
  const groupIds = new Set(group.map(member => member.id));
  const canvasObjects = captureDraggedCanvasObjects(viewer.svg, group, groupIds);
  if (!canvasObjects.length) {
    return null;
  }

  (target as SVGGraphicsElement)?.setPointerCapture?.(event.pointerId);
  return {
    canvasObjects,
    internalLinks: captureInternalLinks(viewer.svg, groupIds),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    startUser,
    moved: false,
  };
}

export type { DraggedCanvasObject, MoveDragState } from './types';
