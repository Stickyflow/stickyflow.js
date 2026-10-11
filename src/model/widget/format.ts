export function formatRollingNumber(value: string | number, digits: number | undefined): string {
  const text = String(value);
  if (digits === undefined) {
    return text;
  }
  if (!Number.isInteger(digits) || digits < 1) {
    return text;
  }
  return text.padStart(digits, '0');
}
