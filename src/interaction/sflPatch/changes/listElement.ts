export function replaceListElement(
  text: string,
  index: number,
  replacement: (current: string) => string,
): string | null {
  const open = text.indexOf('[');
  if (open < 0) {
    return null;
  }

  let depth = 0;
  let elementStart = -1;
  let elementIndex = 0;
  for (let cursor = open; cursor < text.length; cursor++) {
    const character = text[cursor];
    if (character === '[') {
      depth++;
      if (depth === 1) {
        elementStart = cursor + 1;
      }
      continue;
    }
    if (character === ']') {
      depth--;
      if (depth > 0) {
        continue;
      }
      if (elementIndex !== index || !text.slice(elementStart, cursor).trim()) {
        return null;
      }
      return text.slice(0, elementStart) + replacement(text.slice(elementStart, cursor)) + text.slice(cursor);
    }
    if (character === ',' && depth === 1) {
      if (elementIndex === index) {
        return text.slice(0, elementStart) + replacement(text.slice(elementStart, cursor)) + text.slice(cursor);
      }
      elementIndex++;
      elementStart = cursor + 1;
    }
  }
  return null;
}
