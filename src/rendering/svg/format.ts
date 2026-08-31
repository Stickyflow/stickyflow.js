export const xml = (value: unknown): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const num = (value: number): string => Number(value.toFixed(3)).toString();

export const safeId = (value: string): string => `sf-${value.replace(/[^A-Za-z0-9_.:-]/g, '-')}`;
