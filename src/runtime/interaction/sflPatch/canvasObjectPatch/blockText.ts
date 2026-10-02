import { escapeSflString, indentBlock, round1 } from '../format';
import type { InsertCanvasObjectOptions } from './types';

function canvasObjectBlockKind(kind: InsertCanvasObjectOptions['kind']): 'Table' | 'Shape' | 'Container' {
  if (kind === 'table') {
    return 'Table';
  }
  if (kind === 'shape') {
    return 'Shape';
  }
  return 'Container';
}

export function buildCanvasObjectBlock(
  options: InsertCanvasObjectOptions,
  origin: { x: number; y: number },
  baseIndent: string,
): string[] {
  const bodyIndent = `${baseIndent}    `;
  const block: string[] = [`${baseIndent}${canvasObjectBlockKind(options.kind)} ${options.id} {`];

  if (options.kind === 'frame' || options.kind === 'swimlane') {
    block.push(`${bodyIndent}kind: ${options.kind}`);
  }
  if (options.text !== undefined) {
    block.push(`${bodyIndent}text: "${escapeSflString(options.text)}"`);
  }
  if (options.body) {
    block.push(...indentBlock(options.body, bodyIndent));
  }

  block.push(
    `${bodyIndent}layout {`,
    `${bodyIndent}    position: ${round1(options.x - origin.x)}, ${round1(options.y - origin.y)}`,
    `${bodyIndent}    size: ${round1(options.width)}, ${round1(options.height)}`,
    `${bodyIndent}}`,
    `${baseIndent}}`,
  );
  return block;
}
