import type { Side } from '../../model/geometry/router';
import { sflToCanvasState } from '../../sfl';
import { escapeSflString, indentBlock, indentOf, round2 } from './format';
import { findFirstBlockOfKind, findOwnerBlock, nameExists, VALID_IDENT } from './scanner';

export interface InsertLinkOptions {
  id: string;
  fromId: string;
  toId: string;
  fromSide?: Side;
  fromFraction?: number;
  toSide?: Side;
  toFraction?: number;
  text?: string;
  body?: string;
}

export function insertLink(sfl: string, options: InsertLinkOptions): string {
  if (!VALID_IDENT.test(options.id)) return sfl;
  const lines = sfl.split('\n');
  if (nameExists(lines, options.id)) return sfl;

  const state = sflToCanvasState(sfl);
  if (!state.entities.some(e => e.id === options.fromId)) return sfl;
  if (!state.entities.some(e => e.id === options.toId)) return sfl;

  const model = findFirstBlockOfKind(lines, 'Model');
  if (!model) return sfl;

  const baseIndent = `${indentOf(lines[model.start])}    `;
  const bodyIndent = `${baseIndent}    `;
  const endpoint = (id: string, side?: Side, fraction?: number) =>
    side ? `${id}, ${side}${fraction !== undefined ? ` (${round2(fraction)})` : ''}` : id;

  const block: string[] = [
    `${baseIndent}Link ${options.id} {`,
    `${bodyIndent}from: ${endpoint(options.fromId, options.fromSide, options.fromFraction)}`,
    `${bodyIndent}to: ${endpoint(options.toId, options.toSide, options.toFraction)}`,
  ];

  if (options.text !== undefined) {
    block.push(`${bodyIndent}text: "${escapeSflString(options.text)}"`);
  }

  if (options.body) block.push(...indentBlock(options.body, bodyIndent));
  block.push(`${baseIndent}}`);

  lines.splice(model.end, 0, ...block);
  return lines.join('\n');
}

export function removeLink(sfl: string, id: string): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, id);

  if (!range) return sfl;

  lines.splice(range.start, range.end - range.start + 1);
  return lines.join('\n');
}
