import type { BlockKind } from '../../../sflLanguage/ast';

export const CANVAS_OBJECT_BLOCK_KINDS = [
  'Entity',
  'Shape',
  'Text',
  'Container',
  'Path',
  'Chart',
  'Widget',
  'Component',
  'Isometric',
] as const satisfies readonly BlockKind[];

export type CanvasObjectBlockKind = (typeof CANVAS_OBJECT_BLOCK_KINDS)[number];

const canvasObjectBlockKinds: ReadonlySet<BlockKind> = new Set(CANVAS_OBJECT_BLOCK_KINDS);

export function isCanvasObjectBlockKind(kind: BlockKind): kind is CanvasObjectBlockKind {
  return canvasObjectBlockKinds.has(kind);
}
