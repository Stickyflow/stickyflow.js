import { sflToCanvasState } from '../../sfl'
import type { Side } from '../../model/geometry/router'
import { VALID_IDENT, findFirstBlockOfKind, findOwnerBlock, nameExists } from './scanner'
import { escapeSflString, indentBlock, indentOf, round2 } from './format'

export interface InsertLinkOptions {
  id: string;
  fromId: string;
  toId: string;
  fromSide?: Side;
  fromFraction?: number;
  toSide?: Side;
  toFraction?: number;
  text?: string;
  /** Extra lines injected verbatim (style properties, markers, …) — same
   *  reasoning as InsertEntityOptions.body. */
  body?: string;
}

/** Appends a new Link block at the top (Model) level — SFL resolves `from:`/
 *  `to:` by bare name regardless of nesting (spec §10), so this doesn't need
 *  to match the main app's convention of nesting a link inside a shared
 *  Frame when both endpoints live in one. A no-op if `id` is invalid or
 *  already taken, or if `fromId`/`toId` don't name an existing entity. */
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

/** Removes a Link's whole block. A no-op if `id` isn't found. */
export function removeLink(sfl: string, id: string): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, id);

  if (!range) return sfl;

  lines.splice(range.start, range.end - range.start + 1);
  return lines.join('\n');
}
