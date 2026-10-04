import { indentBlock } from '../format';
import type { InsertConnectionOptions } from './types';

export function buildConnectionBlock(options: InsertConnectionOptions, baseIndent: string): string[] {
  const bodyIndent = `${baseIndent}    `;
  const block: string[] = [
    `${baseIndent}Connection ${options.id} {`,
    `${bodyIndent}from: ${options.fromId}`,
    `${bodyIndent}to: ${options.toId}`,
    `${bodyIndent}fromFace: "${options.fromFace}"`,
    `${bodyIndent}toFace: "${options.toFace}"`,
  ];

  if (options.body) {
    block.push(...indentBlock(options.body, bodyIndent));
  }

  block.push(`${baseIndent}}`);
  return block;
}
