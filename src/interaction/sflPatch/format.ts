export function indentBlock(body: string, indent: string): string[] {
  return body.split('\n').map(line => (line.trim() ? `${indent}${line}` : line));
}

export const indentOf = (line: string): string => line.match(/^[ \t]*/)?.[0] ?? '';
export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const round2 = (n: number): number => Math.round(n * 100) / 100;
/**
 * Escapes a value for a short `"…"` string, which is the only string form this
 * file emits. The lexer accepts exactly four escapes there (`\"`, `\\`, `\n`,
 * `\t`) and *throws* on a literal newline — so a multi-line label (a shape
 * captioned "Kai Havertz\nST · drops deep", say) written out raw produced SFL
 * that no longer parses, and every patch carrying one silently failed.
 *
 * Order matters: backslashes first, so the escapes added afterwards aren't
 * escaped a second time. CR has no escape sequence in the grammar at all, so
 * CRLF/CR is normalised to LF rather than being emitted as something the lexer
 * would reject.
 */
export const escapeSflString = (value: string): string => value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\r\n?/g, '\n')
  .replace(/\n/g, '\\n')
  .replace(/\t/g, '\\t');

