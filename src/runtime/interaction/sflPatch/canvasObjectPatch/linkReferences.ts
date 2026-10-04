import { blockEndLine, type LineRange } from '../scanner';

const LINK_HEADER = /^\s*(?:Link|Connection)\s+([A-Za-z_][A-Za-z0-9_]*)\b/;

export function findReferencingLinkRanges(lines: string[], canvasObjectId: string): LineRange[] {
  const endpointReference = new RegExp(`\\b(from|to)\\s*:\\s*${canvasObjectId}\\b`);
  const ranges: LineRange[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    if (!LINK_HEADER.test(lines[lineIndex])) {
      lineIndex++;
      continue;
    }

    const end = blockEndLine(lines, lineIndex);
    if (lines.slice(lineIndex, end + 1).some(line => endpointReference.test(line))) {
      ranges.push({ start: lineIndex, end });
    }
    lineIndex = end + 1;
  }

  return ranges;
}
