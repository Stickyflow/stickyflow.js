// How a number and a string are written, so the same text comes out for the same value.
export function formatNumber(value: number): string {
  if (Object.is(value, -0)) {
    return '0';
  }
  return String(value);
}

export function emitString(value: string): string {
  const escaped = value
    .replace(/\r\n?/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}
