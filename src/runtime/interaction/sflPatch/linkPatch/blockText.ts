import { escapeSflString, indentBlock } from '../format';
import { formatLinkEndpoint } from './endpointText';
import type { InsertLinkOptions } from './types';

export function buildLinkBlock(options: InsertLinkOptions, baseIndent: string): string[] {
  const bodyIndent = `${baseIndent}    `;
  const from = formatLinkEndpoint({ id: options.fromId, side: options.fromSide, fraction: options.fromFraction });
  const to = formatLinkEndpoint({ id: options.toId, side: options.toSide, fraction: options.toFraction });
  const block: string[] = [`${baseIndent}Link ${options.id} {`, `${bodyIndent}from: ${from}`, `${bodyIndent}to: ${to}`];

  if (options.text !== undefined) {
    block.push(`${bodyIndent}text: "${escapeSflString(options.text)}"`);
  }
  if (options.body) {
    block.push(...indentBlock(options.body, bodyIndent));
  }

  block.push(`${baseIndent}}`);
  return block;
}
