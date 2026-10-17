import type { IsometricFace } from '../../../../model/isometricObject';
import { AXIS_COS, AXIS_SIN } from '../../../../model/isometricObject';
import { isIsometricObject } from '../../../../sflSemantic/canvasObjects/artifacts/isometric/types';
import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { IsometricQuickDuplicateDirection, QuickDuplicateEvent } from '../../events';
import { insertCanvasObject } from '../canvasObjectPatch/insert';
import { insertConnection } from '../connectionPatch/insert';
import { insertLink } from '../linkPatch/insert';

export interface QuickDuplicateOptions {
  // The id of the copy.
  shapeId: string;
  // The id of the link to the copy, or of the connection when the object is isometric.
  linkId: string;
  // The space between the object and its copy. 200 for a shape, 40 for an isometric object.
  gap?: number;
}

type Side = 'top' | 'right' | 'bottom' | 'left';
type Props = Record<string, string> | undefined;

const SHAPE_GAP = 200;
const ISOMETRIC_GAP = 40;

const OPPOSITE_SIDE: Record<Side, Side> = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };

const SHAPE_STYLE_KEYS = [
  'fill',
  'stroke',
  'strokeWidth',
  'strokeStyle',
  'textColor',
  'fontSize',
  'fontFamily',
  'cornerRadius',
  'opacity',
  'shadow',
];
const ISOMETRIC_STYLE_KEYS = [
  'fill',
  'stroke',
  'strokeWidth',
  'cornerRadius',
  'shadow',
  'labelOffsetX',
  'labelOffsetY',
  'labelBackground',
];
const LINK_STYLE_KEYS = ['stroke', 'strokeWidth', 'strokeStyle', 'markerStart', 'markerEnd', 'route'];
const QUOTED_KEYS = new Set(['fill', 'stroke', 'textColor', 'fontFamily', 'shadow', 'labelBackground']);

const ISOMETRIC_FACES: Record<IsometricQuickDuplicateDirection, { fromFace: IsometricFace; toFace: IsometricFace }> = {
  'iso-width-pos': { fromFace: 'right', toFace: 'left' },
  'iso-width-neg': { fromFace: 'left', toFace: 'right' },
  'iso-depth-pos': { fromFace: 'front', toFace: 'back' },
  'iso-depth-neg': { fromFace: 'back', toFace: 'front' },
  'iso-height-pos': { fromFace: 'bottom', toFace: 'top' },
  'iso-height-neg': { fromFace: 'top', toFace: 'bottom' },
};

function styleBlock(props: Props, keys: string[], leading: string[] = []): string | undefined {
  const lines = keys
    .filter(key => props?.[key] !== undefined)
    .map(key =>
      QUOTED_KEYS.has(key) ? `  ${key}: "${props?.[key].replace(/"/g, '\\"')}"` : `  ${key}: ${props?.[key]}`,
    );
  const all = [...leading, ...lines];
  return all.length > 0 ? `style {\n${all.join('\n')}\n}` : undefined;
}

function shapeOffset(side: Side, width: number, height: number, gap: number): { dx: number; dy: number } {
  switch (side) {
    case 'top':
      return { dx: 0, dy: -(height + gap) };
    case 'bottom':
      return { dx: 0, dy: height + gap };
    case 'left':
      return { dx: -(width + gap), dy: 0 };
    case 'right':
      return { dx: width + gap, dy: 0 };
  }
}

// One edge length plus the gap along the isometric axis of the clicked face, so a chain of copies stays on that axis.
function isometricOffset(
  direction: IsometricQuickDuplicateDirection,
  size: { width: number; height: number; depth: number },
  gap: number,
): { dx: number; dy: number } {
  const { width, height, depth } = size;
  switch (direction) {
    case 'iso-width-pos':
      return { dx: (width + gap) * AXIS_COS, dy: (width + gap) * AXIS_SIN };
    case 'iso-width-neg':
      return { dx: -(width + gap) * AXIS_COS, dy: -(width + gap) * AXIS_SIN };
    case 'iso-depth-pos':
      return { dx: -(depth + gap) * AXIS_COS, dy: (depth + gap) * AXIS_SIN };
    case 'iso-depth-neg':
      return { dx: (depth + gap) * AXIS_COS, dy: -(depth + gap) * AXIS_SIN };
    case 'iso-height-pos':
      return { dx: 0, dy: height + gap };
    case 'iso-height-neg':
      return { dx: 0, dy: -(height + gap) };
  }
}

function isIsometricDirection(
  direction: QuickDuplicateEvent['direction'],
): direction is IsometricQuickDuplicateDirection {
  return direction.startsWith('iso-');
}

// Makes the copy a gesture on a quick duplicate bubble asks for: a copy of the object with its look, placed beyond the
// edge that was dragged, and a link from the object to the copy that looks like the other links of the document.
export function applyQuickDuplicateChange(
  sfl: string,
  event: QuickDuplicateEvent,
  options: QuickDuplicateOptions,
): string {
  const state = sflToCanvasState(sfl);
  const found = state.canvasObjects.find(candidate => candidate.id === event.owner.id);
  if (!found) {
    return sfl;
  }
  const { direction } = event;
  if (isIsometricDirection(direction)) {
    if (!isIsometricObject(found)) {
      return sfl;
    }
    const { dx, dy } = isometricOffset(
      direction,
      { width: found.width, height: found.height, depth: found.isometric.depth },
      options.gap ?? ISOMETRIC_GAP,
    );
    const stacked = direction.startsWith('iso-height-');
    // A copy stacked flush on the object would cast a shadow onto it.
    const body = stacked
      ? styleBlock(
          found.props,
          ISOMETRIC_STYLE_KEYS.filter(key => key !== 'shadow'),
          ['  shadow: "off"'],
        )
      : styleBlock(found.props, ISOMETRIC_STYLE_KEYS);
    const withObject = insertCanvasObject(sfl, {
      id: options.shapeId,
      kind: 'isometric',
      text: found.text ?? '',
      x: found.x + dx,
      y: found.y + dy,
      width: found.width,
      height: found.height,
      depth: found.isometric.depth,
      parentId: found.parentFrameId,
      body,
    });
    return insertConnection(withObject, {
      id: options.linkId,
      fromId: found.id,
      toId: options.shapeId,
      ...ISOMETRIC_FACES[direction],
    });
  }
  if (isIsometricObject(found)) {
    return sfl;
  }
  const side: Side = direction;
  const { dx, dy } = shapeOffset(side, found.width, found.height, options.gap ?? SHAPE_GAP);
  const reference = state.links.find(link => link.fromId === found.id) ?? state.links[0];
  const withObject = insertCanvasObject(sfl, {
    id: options.shapeId,
    kind: 'shape',
    text: found.text ?? '',
    x: found.x + dx,
    y: found.y + dy,
    width: found.width,
    height: found.height,
    parentId: found.parentFrameId,
    body: styleBlock(found.props, SHAPE_STYLE_KEYS, found.shapeType ? [`  shape: ${found.shapeType}`] : []),
  });
  return insertLink(withObject, {
    id: options.linkId,
    fromId: found.id,
    toId: options.shapeId,
    fromSide: side,
    toSide: OPPOSITE_SIDE[side],
    body: styleBlock(reference?.props, LINK_STYLE_KEYS),
  });
}
