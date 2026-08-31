import { sflToCanvasState } from '../../sfl'
import type { TextChangeEvent, MoveChangeEvent, ResizeChangeEvent, LinkReconnectEvent, ChartValueChangeEvent } from '../events'
import { VALID_IDENT, findChildBlock, findDirectProperty, findOwnerBlock } from './scanner'
import { round1 } from './format'
import { setEndpoint, setOrInsertLayoutTuples, setOrInsertText } from './properties'

/** Applies a `textChange` event's new label to the owner's `text:` —
 *  inserted right after its opening brace if it doesn't have one yet (e.g. a
 *  previously unlabeled link). Works for both Entity and Link owners; a no-op
 *  if `owner.id` isn't found in `sfl` at all. */
export function applyTextChange(sfl: string, event: TextChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertText(lines, range, event.text);
  return lines.join('\n');
}

/** Applies a `moveChange` event's delta to the owner's `layout { position }`.
 *  Reads the CURRENT resolved position through the real parser/cascade
 *  (`sflToCanvasState`) rather than only ever looking at a local `layout {}`
 *  — an entity's position is just as often inherited from a composed
 *  `Layout` reference as set inline, and `dx`/`dy` need to add to whichever
 *  one is actually in effect. A no-op if `owner.id` isn't a known entity. */
export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  const entity = sflToCanvasState(sfl).entities.find(e => e.id === event.owner.id);
  if (!entity) return sfl;
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertLayoutTuples(lines, range, [['position', entity.x + event.dx, entity.y + event.dy]]);
  return lines.join('\n');
}

/** Applies a `resizeChange` event's resulting absolute bounds to the owner's
 *  `layout { position, size }` — absolute, not delta, matching the event's
 *  own doc comment (a size is often inherited, so there may be nothing local
 *  to add a delta to). A no-op if `owner.id` isn't found in `sfl` at all. */
export function applyResizeChange(sfl: string, event: ResizeChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertLayoutTuples(lines, range, [['position', event.x, event.y], ['size', event.width, event.height]]);
  return lines.join('\n');
}

/** Replaces element `index` of the bracketed list in `text`, leaving every
 *  other element's own spacing and formatting untouched. Returns null when
 *  there is no such element — an out-of-range index, or no list at all. */
function replaceListElement(text: string, index: number, next: (current: string) => string): string | null {
  const open = text.indexOf('[');
  if (open < 0) return null;
  let depth = 0, elemStart = -1, n = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') { depth++; if (depth === 1) elemStart = i + 1; continue; }
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

/**
 * Applies a `chartValueChange` event to the chart's own
 * `Series <id> { values: [...] }` — only that one element of that one list;
 * every other value, and the line's own spacing, is left exactly as written.
 * An `[x, y]` pair element keeps its x and takes the new y, matching what the
 * gesture actually moved. A no-op if the chart, the series, its `values`, or
 * that index isn't found.
 */
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
  const patched = replaceListElement(line.slice(span.start, span.end), event.index, (current) => {
    const pair = current.match(/^(\s*\[\s*[-\d.]+\s*,\s*)([-\d.]+)(\s*\]\s*)$/);
    if (pair) return `${pair[1]}${round1(event.value)}${pair[3]}`;
    const spacing = current.match(/^(\s*)(?:.*?)(\s*)$/);
    return `${spacing?.[1] ?? ''}${round1(event.value)}${spacing?.[2] ?? ''}`;
  });
  if (patched === null) return sfl;
  lines[span.line] = line.slice(0, span.start) + patched + line.slice(span.end);
  return lines.join('\n');
}

/** Applies a `linkReconnect` event's new anchor to the link's `from:`/`to:`
 *  endpoint (whichever `event.end` names) — the target entity, side, and
 *  fraction all change together as one value. A no-op if `owner.id` (the
 *  link) isn't found in `sfl` at all. */
export function applyLinkReconnectChange(sfl: string, event: LinkReconnectEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setEndpoint(lines, range, event.end, event.target.id, event.side, event.fraction);
  return lines.join('\n');
}

