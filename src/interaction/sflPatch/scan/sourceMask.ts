import { type Token, tokenize } from '../../../sflLanguage';

const STRING_FILLER = '"';

export interface MaskedSource {
  lines: string[];
  continuesString: boolean[];
}

function overwrite(masked: string[], row: number, from: number, to: number, text: string): void {
  const line = masked[row];
  if (line === undefined) {
    return;
  }
  masked[row] = line.slice(0, from) + text + line.slice(to);
}

function applyToken(target: MaskedSource, lines: string[], token: Token): void {
  const startRow = token.line - 1;
  const endRow = token.endLine - 1;
  const startCol = token.col - 1;
  const endCol = token.endCol - 1;
  const isString = token.type === 'string';

  if (startRow === endRow) {
    const source = lines[startRow];
    if (source === undefined) {
      return;
    }
    const text = isString ? STRING_FILLER.repeat(Math.max(0, endCol - startCol)) : source.slice(startCol, endCol);
    overwrite(target.lines, startRow, startCol, endCol, text);
    return;
  }

  const firstLength = lines[startRow]?.length ?? 0;
  overwrite(target.lines, startRow, startCol, firstLength, STRING_FILLER.repeat(Math.max(0, firstLength - startCol)));
  target.continuesString[startRow] = true;
  for (let row = startRow + 1; row < endRow; row++) {
    const length = lines[row]?.length ?? 0;
    overwrite(target.lines, row, 0, length, STRING_FILLER.repeat(length));
    target.continuesString[row] = true;
  }
  overwrite(target.lines, endRow, 0, endCol, STRING_FILLER.repeat(Math.max(0, endCol)));
}

export function maskSource(lines: string[]): MaskedSource | null {
  let tokens: Token[];
  try {
    tokens = tokenize(lines.join('\n'));
  } catch {
    return null;
  }

  const target: MaskedSource = {
    lines: lines.map(line => ' '.repeat(line.length)),
    continuesString: lines.map(() => false),
  };
  for (const token of tokens) {
    if (token.type === 'newline' || token.type === 'eof') {
      continue;
    }
    applyToken(target, lines, token);
  }
  return target;
}

export function maskLines(lines: string[]): string[] | null {
  return maskSource(lines)?.lines ?? null;
}

export function braceDelta(masked: string): number {
  let delta = 0;
  for (const character of masked) {
    if (character === '{') {
      delta++;
    } else if (character === '}') {
      delta--;
    }
  }
  return delta;
}
