export const isLetter = (character: string): boolean => /[A-Za-z_]/.test(character);
export const isDigit = (character: string): boolean => character >= '0' && character <= '9';
export const isIdentPart = (character: string): boolean => /[A-Za-z0-9_]/.test(character);
