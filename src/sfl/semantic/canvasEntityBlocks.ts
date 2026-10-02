import type { BlockKind } from '../ast';

export const CANVAS_ENTITY_BLOCK_KINDS = [
  'Entity',
  'Shape',
  'Container',
  'Table',
  'Path',
  'Chart',
] as const satisfies readonly BlockKind[];

export type CanvasEntityBlockKind = (typeof CANVAS_ENTITY_BLOCK_KINDS)[number];

const canvasEntityBlockKinds: ReadonlySet<BlockKind> = new Set(CANVAS_ENTITY_BLOCK_KINDS);

export function isCanvasEntityBlockKind(kind: BlockKind): kind is CanvasEntityBlockKind {
  return canvasEntityBlockKinds.has(kind);
}
