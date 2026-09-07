import type { PropertyChangeEvent, PropertyValue } from '../../events';
import { insertDirectProperty, replacePropertyValue } from '../edits/propertyValues';
import { escapeSflString, indentOf } from '../format';
import { findDirectProperty, findOwnerBlock, type PropertySpan, parsePropertyPath, resolveBlocks } from '../scanner';
import { growListElement, replaceListElement } from './listElement';

export function applyPropertyChange(sfl: string, event: PropertyChangeEvent): string {
  const path = parsePropertyPath(event.path);
  if (path === null || !isWritableValue(event.value)) {
    return sfl;
  }

  const lines = sfl.split('\n');
  const owner = findOwnerBlock(lines, event.owner.id);
  if (owner === null) {
    return sfl;
  }

  const range = resolveBlocks(lines, owner, path.blocks);
  if (range === null) {
    return sfl;
  }

  const span = findDirectProperty(lines, range, path.property.name);
  if (span === null) {
    const indent = `${indentOf(lines[range.start])}    `;
    if (path.property.indices.length === 1) {
      const [index] = path.property.indices;
      const items = growListElement('[]', index, formatValue(event.value, undefined, event.quote));
      if (items === null) {
        return sfl;
      }
      insertDirectProperty(lines, range, indent, path.property.name, items);
      return lines.join('\n');
    }
    if (path.property.indices.length > 0) {
      return sfl;
    }
    insertDirectProperty(lines, range, indent, path.property.name, formatValue(event.value, undefined, event.quote));
    return lines.join('\n');
  }

  const current = readSpan(lines, span);
  const next =
    path.property.indices.length > 0
      ? replaceIndexed(current, path.property.indices, event)
      : formatValue(event.value, current, event.quote);
  if (next === null) {
    return sfl;
  }

  replacePropertyValue(lines, span, next);
  return lines.join('\n');
}

function isWritableValue(value: PropertyValue): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'object') {
    return value.length > 0 && value.every(entry => Number.isFinite(entry));
  }
  return true;
}

function readSpan(lines: string[], span: PropertySpan): string {
  if (span.line === span.endLine) {
    return lines[span.line].slice(span.start, span.end);
  }
  const first = lines[span.line].slice(span.start);
  const middle = lines.slice(span.line + 1, span.endLine);
  return [first, ...middle, lines[span.endLine].slice(0, span.end)].join('\n');
}

function replaceIndexed(text: string, indices: readonly number[], event: PropertyChangeEvent): string | null {
  const [head, ...rest] = indices;
  let failed = false;

  const result = replaceListElement(text, head, current => {
    if (rest.length === 0) {
      return withSpacing(current, formatValue(event.value, current, event.quote));
    }
    const inner = replaceIndexed(current, rest, event);
    if (inner === null) {
      failed = true;
      return current;
    }
    return inner;
  });

  if (result !== null) {
    return failed ? null : result;
  }
  return rest.length === 0 ? growListElement(text, head, formatValue(event.value, undefined, event.quote)) : null;
}

function withSpacing(current: string, value: string): string {
  const spacing = current.match(/^(\s*)[\s\S]*?(\s*)$/);
  return `${spacing?.[1] ?? ''}${value}${spacing?.[2] ?? ''}`;
}

function formatValue(value: PropertyValue, current: string | undefined, quote: boolean | undefined): string {
  if (typeof value === 'object') {
    return value.map(String).join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return shouldQuote(current, quote) ? `"${escapeSflString(value)}"` : value;
}

function shouldQuote(current: string | undefined, quote: boolean | undefined): boolean {
  if (quote !== undefined) {
    return quote;
  }
  return current === undefined || current.trim().startsWith('"');
}
