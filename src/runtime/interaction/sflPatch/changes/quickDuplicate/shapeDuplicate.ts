import type { SflLinkOut } from '../../../../../sflSemantic/canvasObjects/artifacts/links/types';
import type { SflCanvasObject } from '../../../../../sflSemantic/sflToCanvasState';
import { insertCanvasObject } from '../../canvasObjectPatch/insert';
import type { InsertCanvasObjectOptions } from '../../canvasObjectPatch/types';
import { insertLink } from '../../linkPatch/insert';
import type { InsertLinkOptions } from '../../linkPatch/types';
import { styleBlock } from './styleBlock';
import type { QuickDuplicateOptions, Side } from './types';

const SHAPE_GAP = 200;

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
const LINK_STYLE_KEYS = ['stroke', 'strokeWidth', 'strokeStyle', 'markerStart', 'markerEnd', 'route'];

function shapeOffset(side: Side, object: SflCanvasObject, gap: number): { dx: number; dy: number } {
  switch (side) {
    case 'top':
      return { dx: 0, dy: -(object.height + gap) };
    case 'bottom':
      return { dx: 0, dy: object.height + gap };
    case 'left':
      return { dx: -(object.width + gap), dy: 0 };
    case 'right':
      return { dx: object.width + gap, dy: 0 };
  }
}

function copyOf(object: SflCanvasObject, side: Side, options: QuickDuplicateOptions): InsertCanvasObjectOptions {
  const { dx, dy } = shapeOffset(side, object, options.gap ?? SHAPE_GAP);
  const shape = object.shapeType ? [`  shape: ${object.shapeType}`] : [];
  return {
    id: options.shapeId,
    kind: 'shape',
    text: object.text ?? '',
    x: object.x + dx,
    y: object.y + dy,
    width: object.width,
    height: object.height,
    parentId: object.parentFrameId,
    body: styleBlock(object.props, SHAPE_STYLE_KEYS, shape),
  };
}

// The new link looks like the other links that leave the object, or else like the first link of the document.
function linkStyleReference(links: SflLinkOut[], objectId: string): SflLinkOut | undefined {
  return links.find(link => link.fromId === objectId) ?? links[0];
}

function linkToCopy(
  object: SflCanvasObject,
  links: SflLinkOut[],
  side: Side,
  options: QuickDuplicateOptions,
): InsertLinkOptions {
  return {
    id: options.linkId,
    fromId: object.id,
    toId: options.shapeId,
    fromSide: side,
    toSide: OPPOSITE_SIDE[side],
    body: styleBlock(linkStyleReference(links, object.id)?.props, LINK_STYLE_KEYS),
  };
}

export function duplicateShape(
  sfl: string,
  input: { object: SflCanvasObject; links: SflLinkOut[]; side: Side; options: QuickDuplicateOptions },
): string {
  const { object, links, side, options } = input;
  const withCopy = insertCanvasObject(sfl, copyOf(object, side, options));
  return insertLink(withCopy, linkToCopy(object, links, side, options));
}
