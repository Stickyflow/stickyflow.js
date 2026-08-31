import { sflToCanvasState } from '../../sfl';
import type {
  ChartValueChangeEvent,
  LinkReconnectEvent,
  MoveChangeEvent,
  ResizeChangeEvent,
  TextChangeEvent,
} from '../events';
import { round1 } from './format';
import { setEndpoint, setOrInsertLayoutTuples, setOrInsertText } from './properties';
import { findChildBlock, findDirectProperty, findOwnerBlock, VALID_IDENT } from './scanner';

export function applyTextChange(sfl: string, event: TextChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertText(lines, range, event.text);
  return lines.join('\n');
}

export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  const entity = sflToCanvasState(sfl).entities.find(e => e.id === event.owner.id);
  if (!entity) return sfl;
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertLayoutTuples(lines, range, [['position', entity.x + event.dx, entity.y + event.dy]]);
  return lines.join('\n');
}

export function applyResizeChange(sfl: string, event: ResizeChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertLayoutTuples(lines, range, [
    ['position', event.x, event.y],
    ['size', event.width, event.height],
  ]);
  return lines.join('\n');
}

function replaceListElement(text: string, index: number, next: (current: string) => string): string | null {
  const open = text.indexOf('[');
  if (open < 0) return null;
  let depth = 0,
    elemStart = -1,
    n = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') {
      depth++;
      if (depth === 1) elemStart = i + 1;
      continue;
    }
    if (ch === ']') {
      depth--;
      if (depth > 0) continue;
      if (n !== index || !text.slice(elemStart, i).trim()) return null;
      return text.slice(0, elemStart) + next(text.slice(elemStart, i)) + text.slice(i);
    }
    if (ch === ',' && depth === 1) {
      if (n === index) return text.slice(0, elemStart) + next(text.slice(elemStart, i)) + text.slice(i);
      n++;
      elemStart = i + 1;
    }
  }
  return null;
}

export function applyChartValueChange(sfl: string, event: ChartValueChangeEvent): string {
  const lines = sfl.split('\n');
  const chart = findOwnerBlock(lines, event.owner.id);
  if (!chart) return sfl;
  if (!VALID_IDENT.test(event.series)) return sfl;
  const series = findChildBlock(lines, chart, new RegExp(`^\\s*Series\\s+${event.series}\\b`));
  if (!series) return sfl;
  const span = findDirectProperty(lines, series, 'values');
  if (!span) return sfl;
  const line = lines[span.line];
  const patched = replaceListElement(line.slice(span.start, span.end), event.index, current => {
    const pair = current.match(/^(\s*\[\s*[-\d.]+\s*,\s*)([-\d.]+)(\s*\]\s*)$/);
    if (pair) return `${pair[1]}${round1(event.value)}${pair[3]}`;
    const spacing = current.match(/^(\s*)(?:.*?)(\s*)$/);
    return `${spacing?.[1] ?? ''}${round1(event.value)}${spacing?.[2] ?? ''}`;
  });
  if (patched === null) return sfl;
  lines[span.line] = line.slice(0, span.start) + patched + line.slice(span.end);
  return lines.join('\n');
}

export function applyLinkReconnectChange(sfl: string, event: LinkReconnectEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setEndpoint(lines, range, event.end, event.target.id, event.side, event.fraction);
  return lines.join('\n');
}
