export const isLetter = (character: string | undefined): character is string =>
  character !== undefined && /^[A-Za-z_]$/.test(character);

export const isDigit = (character: string | undefined): character is string =>
  character !== undefined && character >= '0' && character <= '9';

export const isIdentPart = (character: string | undefined): character is string =>
  character !== undefined && /^[A-Za-z0-9_]$/.test(character);
