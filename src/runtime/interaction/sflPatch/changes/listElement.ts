interface ListElementSpan {
  start: number;
  end: number;
}

function skipString(text: string, quoteIndex: number): number {
  for (let cursor = quoteIndex + 1; cursor < text.length; cursor++) {
    if (text[cursor] === '\\') {
      cursor++;
    } else if (text[cursor] === '"') {
      return cursor;
    }
  }
  return text.length - 1;
}

function closingBracket(text: string, openIndex: number): number {
  if (openIndex < 0) {
    return -1;
  }
  let depth = 0;
  for (let cursor = openIndex; cursor < text.length; cursor++) {
    if (text[cursor] === '"') {
      cursor = skipString(text, cursor);
    } else if (text[cursor] === '[') {
      depth++;
    } else if (text[cursor] === ']') {
      depth--;
      if (depth === 0) {
        return cursor;
      }
    }
  }
  return -1;
}

export function listElementSpans(text: string): { spans: ListElementSpan[]; start: number; end: number } | null {
  const listStart = text.indexOf('[');
  const listEnd = closingBracket(text, listStart);
  if (listStart < 0 || listEnd < 0) {
    return null;
  }
  const body = text.slice(listStart + 1, listEnd);
  if (!body.trim()) {
    return { spans: [], start: listStart, end: listEnd };
  }

  const spans: ListElementSpan[] = [];
  let depth = 0;
  let elementStart = 0;
  for (let cursor = 0; cursor < body.length; cursor++) {
    const character = body[cursor];
    if (character === '"') {
      cursor = skipString(body, cursor);
    } else if (character === '[') {
      depth++;
    } else if (character === ']') {
      depth--;
    } else if (character === ',' && depth === 0) {
      spans.push({ start: listStart + 1 + elementStart, end: listStart + 1 + cursor });
      elementStart = cursor + 1;
    }
  }
  spans.push({ start: listStart + 1 + elementStart, end: listEnd });
  return { spans, start: listStart, end: listEnd };
}

export function replaceListElement(
  text: string,
  index: number,
  replacement: (current: string) => string,
): string | null {
  const list = listElementSpans(text);
  const span = list?.spans[index];
  if (!span) {
    return null;
  }
  const current = text.slice(span.start, span.end);
  return text.slice(0, span.start) + replacement(current) + text.slice(span.end);
}

export function replaceListElementAt(
  text: string,
  matchElement: (element: string) => boolean,
  replacement: (current: string) => string,
): string | null {
  const list = listElementSpans(text);
  const span = list?.spans.find(candidate => matchElement(text.slice(candidate.start, candidate.end)));
  if (!span) {
    return null;
  }
  const current = text.slice(span.start, span.end);
  return text.slice(0, span.start) + replacement(current) + text.slice(span.end);
}

export function growListElement(text: string, index: number, value: string): string | null {
  const list = listElementSpans(text);
  if (!list || list.spans.length > index) {
    return null;
  }
  const existing = list.spans.map(span => text.slice(span.start, span.end).trim());
  const padding = Array.from({ length: index - list.spans.length }, () => 'none');
  const items = [...existing, ...padding, value];
  return `${text.slice(0, list.start + 1)}${items.join(', ')}${text.slice(list.end)}`;
}
