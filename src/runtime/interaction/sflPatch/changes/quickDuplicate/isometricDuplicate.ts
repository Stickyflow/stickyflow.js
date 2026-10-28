import type { IsometricFace } from '../../../../../model/isometricObject';
import { AXIS_COS, AXIS_SIN } from '../../../../../model/isometricObject';
import type { SflIsometricObject } from '../../../../../sflSemantic/canvasObjects/artifacts/isometric/object';
import type { IsometricQuickDuplicateDirection, QuickDuplicateEvent } from '../../../events';
import { insertCanvasObject } from '../../canvasObjectPatch/insert';
import type { InsertCanvasObjectOptions } from '../../canvasObjectPatch/types';
import { insertConnection } from '../../connectionPatch/insert';
import { styleBlock } from './styleBlock';
import type { QuickDuplicateOptions } from './types';

const ISOMETRIC_GAP = 40;

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

const TOUCHING_FACES: Record<IsometricQuickDuplicateDirection, { fromFace: IsometricFace; toFace: IsometricFace }> = {
  'iso-width-pos': { fromFace: 'right', toFace: 'left' },
  'iso-width-neg': { fromFace: 'left', toFace: 'right' },
  'iso-depth-pos': { fromFace: 'front', toFace: 'back' },
  'iso-depth-neg': { fromFace: 'back', toFace: 'front' },
  'iso-height-pos': { fromFace: 'bottom', toFace: 'top' },
  'iso-height-neg': { fromFace: 'top', toFace: 'bottom' },
};

export function isIsometricDirection(
  direction: QuickDuplicateEvent['direction'],
): direction is IsometricQuickDuplicateDirection {
  return direction.startsWith('iso-');
}

// One edge length plus the gap along the isometric axis of the clicked face, so a chain of copies stays on that axis.
function isometricOffset(
  direction: IsometricQuickDuplicateDirection,
  object: SflIsometricObject,
  gap: number,
): { dx: number; dy: number } {
  const { width, height } = object;
  const { depth } = object.isometric;
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

// A copy stacked flush on the object would cast a shadow onto it, so it gets none.
function copyStyle(object: SflIsometricObject, direction: IsometricQuickDuplicateDirection): string | undefined {
  if (!direction.startsWith('iso-height-')) {
    return styleBlock(object.props, ISOMETRIC_STYLE_KEYS);
  }
  return styleBlock(
    object.props,
    ISOMETRIC_STYLE_KEYS.filter(key => key !== 'shadow'),
    ['  shadow: "off"'],
  );
}

function copyOf(
  object: SflIsometricObject,
  direction: IsometricQuickDuplicateDirection,
  options: QuickDuplicateOptions,
): InsertCanvasObjectOptions {
  const { dx, dy } = isometricOffset(direction, object, options.gap ?? ISOMETRIC_GAP);
  return {
    id: options.shapeId,
    kind: 'isometric',
    text: object.text ?? '',
    x: object.x + dx,
    y: object.y + dy,
    width: object.width,
    height: object.height,
    depth: object.isometric.depth,
    parentId: object.parentFrameId,
    body: copyStyle(object, direction),
  };
}

export function duplicateIsometricObject(
  sfl: string,
  object: SflIsometricObject,
  direction: IsometricQuickDuplicateDirection,
  options: QuickDuplicateOptions,
): string {
  const withCopy = insertCanvasObject(sfl, copyOf(object, direction, options));
  return insertConnection(withCopy, {
    id: options.linkId,
    fromId: object.id,
    toId: options.shapeId,
    ...TOUCHING_FACES[direction],
  });
}
