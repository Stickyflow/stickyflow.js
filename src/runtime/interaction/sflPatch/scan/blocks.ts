import { braceDelta, maskLines } from './sourceMask';

const OWNER_HEADER =
  /^\s*(Entity|Shape|Text|Image|Container|Chart|Path|Link|Isometric|Widget|Component|Connection|Shader)\s+([A-Za-z_][A-Za-z0-9_]*)\b/;
export const VALID_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface LineRange {
  start: number;
  end: number;
}

function blockEndIn(masked: string[], startLine: number): number {
  let depth = 0;
  for (let i = startLine; i < masked.length; i++) {
    for (const character of masked[i]) {
      if (character === '{') {
        depth++;
      } else if (character === '}') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
  }
  return masked.length - 1;
}

export function blockEndLine(lines: string[], startLine: number): number {
  const masked = maskLines(lines);
  return masked === null ? lines.length - 1 : blockEndIn(masked, startLine);
}

export function findOwnerBlock(lines: string[], id: string): LineRange | null {
  const masked = maskLines(lines);
  if (masked === null) {
    return null;
  }
  for (let i = 0; i < masked.length; i++) {
    const header = masked[i].match(OWNER_HEADER);
    if (!header || header[2] !== id) {
      continue;
    }
    return { start: i, end: blockEndIn(masked, i) };
  }
  return null;
}

export function findChildBlock(lines: string[], range: LineRange, headerRe: RegExp): LineRange | null {
  const masked = maskLines(lines);
  if (masked === null) {
    return null;
  }
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    if (depth === 1 && i > range.start && headerRe.test(masked[i])) {
      return { start: i, end: blockEndIn(masked, i) };
    }
    depth += braceDelta(masked[i]);
  }
  return null;
}

const DATA_BLOCK_HEADER = /^\s*data\s*\{/;

export function findContentChild(
  lines: string[],
  range: LineRange,
  headerRe: RegExp,
  bareHeaderRe?: RegExp,
): LineRange | null {
  const direct = findChildBlock(lines, range, headerRe);
  if (direct !== null) {
    return direct;
  }
  const data = findChildBlock(lines, range, DATA_BLOCK_HEADER);
  if (!data) {
    return null;
  }
  return findChildBlock(lines, data, headerRe) ?? (bareHeaderRe ? findChildBlock(lines, data, bareHeaderRe) : null);
}

export function findChildBlocks(lines: string[], range: LineRange, headerRe: RegExp): LineRange[] {
  const masked = maskLines(lines);
  if (masked === null) {
    return [];
  }
  const blocks: LineRange[] = [];
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    if (depth === 1 && i > range.start && headerRe.test(masked[i])) {
      blocks.push({ start: i, end: blockEndIn(masked, i) });
    }
    depth += braceDelta(masked[i]);
  }
  return blocks;
}

export function findFirstBlockOfKind(lines: string[], kind: string): LineRange | null {
  const masked = maskLines(lines);
  if (masked === null) {
    return null;
  }
  const header = new RegExp(`^\\s*${kind}\\s+([A-Za-z_][A-Za-z0-9_]*)\\b`);
  for (let i = 0; i < masked.length; i++) {
    if (!header.test(masked[i])) {
      continue;
    }
    return { start: i, end: blockEndIn(masked, i) };
  }
  return null;
}

export function nameExists(lines: string[], id: string): boolean {
  const masked = maskLines(lines);
  if (masked === null) {
    return false;
  }
  return masked.some(line => {
    const header = line.match(OWNER_HEADER);
    return header !== null && header[2] === id;
  });
}
