export function indentBlock(body: string, indent: string): string[] {
  return body.split('\n').map(line => (line.trim() ? `${indent}${line}` : line));
}

export const indentOf = (line: string): string => line.match(/^[ \t]*/)?.[0] ?? '';
export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const escapeSflString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r\n?/g, '\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
