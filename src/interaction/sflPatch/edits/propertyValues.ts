import type { LineRange } from '../scan/blocks';
import type { PropertySpan } from '../scan/properties';

export function replacePropertyValue(lines: string[], span: PropertySpan, value: string): void {
  const before = lines[span.line].slice(0, span.start);
  const after = lines[span.endLine].slice(span.end);
  lines.splice(span.line, span.endLine - span.line + 1, `${before}${value}${after}`);
}

export function insertDirectProperty(
  lines: string[],
  range: LineRange,
  indent: string,
  key: string,
  value: string,
): void {
  if (range.start === range.end) {
    const line = lines[range.start];
    const closeAt = line.lastIndexOf('}');
    if (closeAt !== -1) {
      const before = line.slice(0, closeAt).replace(/\s+$/, '');
      const separator = /\{$/.test(before) ? ' ' : '; ';
      lines[range.start] = `${before}${separator}${key}: ${value} }${line.slice(closeAt + 1)}`;
      return;
    }
  }
  lines.splice(range.start + 1, 0, `${indent}${key}: ${value}`);
}
