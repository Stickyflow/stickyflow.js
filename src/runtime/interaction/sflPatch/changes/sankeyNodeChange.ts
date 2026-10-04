import type { SankeyNodeRenameEvent, SankeyNodeReorderEvent } from '../../events';
import { findChildBlocks, findDirectProperty, findOwnerBlock, type LineRange } from '../scanner';
import { reorderListElements, replaceListElementAt } from './listElement';

const ZONE_LABEL = /^\s*\[\s*"((?:[^"\\]|\\.)*)"/;

function zoneLabel(element: string): string | null {
  return element.match(ZONE_LABEL)?.[1] ?? null;
}

function escapeSflString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function applySankeyNodeReorderChange(sfl: string, event: SankeyNodeReorderEvent): string {
  const lines = sfl.split('\n');
  const chart = findOwnerBlock(lines, event.owner.id);
  if (!chart) {
    return sfl;
  }
  const span = findDirectProperty(lines, chart, 'zones');
  if (!span) {
    return sfl;
  }
  const line = lines[span.line];
  const reordered = reorderListElements(
    line.slice(span.start, span.end),
    element => zoneLabel(element) === event.nodeId,
    event.beforeId ? element => zoneLabel(element) === event.beforeId : null,
  );
  if (reordered === null) {
    return sfl;
  }
  lines[span.line] = line.slice(0, span.start) + reordered + line.slice(span.end);
  return lines.join('\n');
}

export function applySankeyNodeRenameChange(sfl: string, event: SankeyNodeRenameEvent): string {
  const label = event.label.trim();
  if (!label || label === event.nodeId) {
    return sfl;
  }
  const lines = sfl.split('\n');
  const chart = findOwnerBlock(lines, event.owner.id);
  if (!chart) {
    return sfl;
  }
  const zonesSpan = findDirectProperty(lines, chart, 'zones');
  if (!zonesSpan) {
    return sfl;
  }
  const zonesLine = lines[zonesSpan.line];
  const renamedZones = replaceListElementAt(
    zonesLine.slice(zonesSpan.start, zonesSpan.end),
    element => zoneLabel(element) === event.nodeId,
    current =>
      current.replace(
        ZONE_LABEL,
        match => match.slice(0, match.length - event.nodeId.length - 1) + escapeSflString(label) + '"',
      ),
  );
  if (renamedZones === null) {
    return sfl;
  }
  lines[zonesSpan.line] = zonesLine.slice(0, zonesSpan.start) + renamedZones + zonesLine.slice(zonesSpan.end);

  const seriesBlocks = findChildBlocks(lines, chart, /^\s*Series\s+[A-Za-z_][A-Za-z0-9_]*\b/);
  for (const series of seriesBlocks) {
    renameEndpoint(lines, series, 'source', event.nodeId, label);
    renameEndpoint(lines, series, 'target', event.nodeId, label);
  }
  return lines.join('\n');
}

function renameEndpoint(
  lines: string[],
  range: LineRange,
  key: 'source' | 'target',
  oldLabel: string,
  newLabel: string,
): void {
  const span = findDirectProperty(lines, range, key);
  if (!span) {
    return;
  }
  const line = lines[span.line];
  const current = line.slice(span.start, span.end);
  const match = current.match(/^(\s*")((?:[^"\\]|\\.)*)("\s*)$/);
  if (!match || match[2] !== oldLabel) {
    return;
  }
  const replaced = `${match[1]}${escapeSflString(newLabel)}${match[3]}`;
  lines[span.line] = line.slice(0, span.start) + replaced + line.slice(span.end);
}
