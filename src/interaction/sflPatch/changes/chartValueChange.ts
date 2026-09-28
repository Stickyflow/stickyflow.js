import type { ChartValueChangeEvent } from '../../events';
import { round1 } from '../format';
import { findContentChild, findDirectProperty, findOwnerBlock, VALID_IDENT } from '../scanner';
import { replaceListElement } from './listElement';

function replaceChartValue(current: string, value: number): string {
  const pair = current.match(/^(\s*\[\s*[-\d.]+\s*,\s*)([-\d.]+)(\s*\]\s*)$/);
  if (pair) {
    return `${pair[1]}${round1(value)}${pair[3]}`;
  }
  const spacing = current.match(/^(\s*)(?:.*?)(\s*)$/);
  return `${spacing?.[1] ?? ''}${round1(value)}${spacing?.[2] ?? ''}`;
}

export function applyChartValueChange(sfl: string, event: ChartValueChangeEvent): string {
  const lines = sfl.split('\n');
  const chart = findOwnerBlock(lines, event.owner.id);
  if (!chart || !VALID_IDENT.test(event.series)) {
    return sfl;
  }

  const series = findContentChild(
    lines,
    chart,
    new RegExp(`^\\s*Series\\s+${event.series}\\b`),
    new RegExp(`^\\s*${event.series}\\s*(?::[^{]*)?\\{`),
  );
  if (!series) {
    return sfl;
  }
  const span = findDirectProperty(lines, series, 'values');
  if (!span) {
    return sfl;
  }

  const line = lines[span.line];
  const patched = replaceListElement(line.slice(span.start, span.end), event.index, current =>
    replaceChartValue(current, event.value),
  );
  if (patched === null) {
    return sfl;
  }
  lines[span.line] = line.slice(0, span.start) + patched + line.slice(span.end);
  return lines.join('\n');
}
