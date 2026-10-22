import { indentBlock, round1 } from '../format';
import type { InsertPathOptions } from './types';

export function buildPathBlock(
  options: InsertPathOptions,
  origin: { x: number; y: number },
  baseIndent: string,
): string[] {
  const bodyIndent = `${baseIndent}    `;
  const points = options.points
    .map(point => {
      const pair = `${round1(point.x - origin.x)}, ${round1(point.y - origin.y)}`;
      return point.tension === undefined ? `[${pair}]` : `[${pair}, ${round1(point.tension)}]`;
    })
    .join(', ');
  const block: string[] = [`${baseIndent}Path ${options.id} {`, `${bodyIndent}points: [${points}]`];

  if (options.closed) {
    block.push(`${bodyIndent}closed: true`);
  }
  if (options.tension) {
    block.push(`${bodyIndent}tension: ${options.tension}`);
  }
  if (options.body) {
    block.push(...indentBlock(options.body, bodyIndent));
  }

  block.push(`${baseIndent}}`);
  return block;
}
