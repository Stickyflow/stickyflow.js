interface ListElementSpan {
  start: number;
  end: number;
}

interface ListElementCursor {
  start: number;
  index: number;
}

export function replaceListElement(
  text: string,
  index: number,
  replacement: (current: string) => string,
): string | null {
  const span = findListElementSpan(text, index);
  return span ? replaceSpan(text, span, replacement) : null;
}

function findListElementSpan(text: string, targetIndex: number): ListElementSpan | null {
  const listStart = text.indexOf('[');
  if (listStart < 0) {
    return null;
  }

  let depth = 1;
  const element = { start: listStart + 1, index: 0 };
  for (let cursor = element.start; cursor < text.length; cursor++) {
    const character = text[cursor];
    if (character === '[') {
      depth++;
      continue;
    }
    if (character === ']') {
      depth--;
      if (depth === 0) {
        return finalElementSpan(text, element, cursor, targetIndex);
      }
      continue;
    }
    if (character === ',' && depth === 1) {
      if (element.index === targetIndex) {
        return { start: element.start, end: cursor };
      }
      element.index++;
      element.start = cursor + 1;
    }
  }
  return null;
}

function finalElementSpan(
  text: string,
  element: ListElementCursor,
  end: number,
  targetIndex: number,
): ListElementSpan | null {
  if (element.index !== targetIndex || !text.slice(element.start, end).trim()) {
    return null;
  }
  return { start: element.start, end };
}

function replaceSpan(text: string, span: ListElementSpan, replacement: (current: string) => string): string {
  const current = text.slice(span.start, span.end);
  return text.slice(0, span.start) + replacement(current) + text.slice(span.end);
}
