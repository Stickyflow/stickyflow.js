import { braceDelta, stripStringsAndComments } from './lexical'



const OWNER_HEADER = /^\s*(Entity|Container|Table|Chart|Path|Link)\s+([A-Za-z_][A-Za-z0-9_]*)\b/;
export const VALID_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;



export interface LineRange { start: number; end: number }



export function blockEndLine(lines: string[], startLine: number): number {
  let depth = 0;
  for (let j = startLine; j < lines.length; j++) {
    for (const ch of stripStringsAndComments(lines[j])) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return j;
      }
    }
  }
  return lines.length - 1;
}

export function findOwnerBlock(lines: string[], id: string): LineRange | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OWNER_HEADER);
    if (!m || m[2] !== id) continue;
    return { start: i, end: blockEndLine(lines, i) };
  }
  return null;
}

export function findChildBlock(lines: string[], range: LineRange, headerRe: RegExp): LineRange | null {
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    if (depth === 1 && i > range.start && headerRe.test(lines[i])) {
      return { start: i, end: blockEndLine(lines, i) };
    }
    depth += braceDelta(lines[i]);
  }
  return null;
}

export function findFirstBlockOfKind(lines: string[], kind: string): LineRange | null {
  const re = new RegExp(`^\\s*${kind}\\s+([A-Za-z_][A-Za-z0-9_]*)\\b`);
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i])) continue;
    return { start: i, end: blockEndLine(lines, i) };
  }
  return null;
}

export function nameExists(lines: string[], id: string): boolean {
  return lines.some(line => {
    const m = line.match(OWNER_HEADER);
    return !!m && m[2] === id;
  });
}

/** Prefixes every non-blank line of a caller-supplied raw-SFL fragment with
 *  `indent`, preserving whatever relative indentation the fragment already
 *  has internally (e.g. a `style { ... }` sub-block's own properties). */

