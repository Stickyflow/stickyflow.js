import { indentOf } from './format';
import type { LineRange } from './scanner';

const DEFAULT_UNIT = '    ';

export function detectIndentUnit(lines: string[], range: LineRange): string {
  const parent = indentOf(lines[range.start]);
  for (let i = range.start + 1; i < range.end; i++) {
    if (!lines[i].trim()) {
      continue;
    }
    const indent = indentOf(lines[i]);
    if (indent.length > parent.length && indent.startsWith(parent)) {
      return indent.slice(parent.length);
    }
  }
  let smallest = '';
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const indent = indentOf(line);
    if (indent && (!smallest || indent.length < smallest.length)) {
      smallest = indent;
    }
  }
  return smallest || DEFAULT_UNIT;
}

export function childIndent(lines: string[], range: LineRange): string {
  return `${indentOf(lines[range.start])}${detectIndentUnit(lines, range)}`;
}

export function insertBlockLines(lines: string[], range: LineRange, build: (baseIndent: string) => string[]): void {
  const unit = detectIndentUnit(lines, range);
  const baseIndent = `${indentOf(lines[range.start])}${unit}`;
  const block = build(baseIndent).map(line => {
    if (!line.startsWith(baseIndent)) {
      return line;
    }
    const rest = line.slice(baseIndent.length);
    const steps = (rest.match(/^( {4})*/)?.[0].length ?? 0) / 4;
    return `${baseIndent}${unit.repeat(steps)}${rest.slice(steps * 4)}`;
  });
  let at = range.end;
  while (at > range.start + 1 && !lines[at - 1].trim()) {
    at--;
  }
  lines.splice(at, 0, ...block);
}
