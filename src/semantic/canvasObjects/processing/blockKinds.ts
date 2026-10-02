import type { BlockKind } from '../../../sfl/ast';

export const CANVAS_OBJECT_BLOCK_KINDS = [
  'Entity',
  'Shape',
  'Container',
  'Table',
  'Path',
  'Chart',
] as const satisfies readonly BlockKind[];

export type CanvasObjectBlockKind = (typeof CANVAS_OBJECT_BLOCK_KINDS)[number];

const canvasObjectBlockKinds: ReadonlySet<BlockKind> = new Set(CANVAS_OBJECT_BLOCK_KINDS);

export function isCanvasObjectBlockKind(kind: BlockKind): kind is CanvasObjectBlockKind {
  return canvasObjectBlockKinds.has(kind);
}
