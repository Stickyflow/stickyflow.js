import { blockEndLine } from '../scan/blocks';
import { braceDelta, maskLines } from '../scan/sourceMask';

const REPEAT_HEADER = /^(\s*)Repeat\s+[A-Za-z_]\w*\s*\{\s*$/;
const TEMPLATE_HEADER = /^\s*[A-Z]\w*\s+([A-Za-z_]\w*)\b[^{]*\{/;
const PROPERTY = /^\s*[A-Za-z_]\w*\s*:/;
const WHERE = /^(\s*)where\s*:\s*(.+?)\s*$/;

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A block that a Repeat made has no lines of its own, so it is taken away by keeping its cell out of the Repeat: the cell is added to `where`.
// The other blocks of that cell go with it, and every other cell stays as it was, as each cell has random numbers of its own.
export function excludeRepeatCell(lines: string[], id: string): string[] | null {
  const masked = maskLines(lines);
  if (masked === null) {
    return null;
  }
  for (let start = 0; start < masked.length; start++) {
    const header = masked[start].match(REPEAT_HEADER);
    if (!header) {
      continue;
    }
    const end = blockEndLine(lines, start);
    let depth = 0;
    let cell: { col: number; row: number } | null = null;
    let whereLine = -1;
    let lastProperty = start;
    let seenTemplate = false;
    for (let i = start; i <= end; i++) {
      if (depth === 1 && i > start) {
        const template = masked[i].match(TEMPLATE_HEADER);
        if (template) {
          seenTemplate = true;
          const made = id.match(new RegExp(`^${escaped(template[1])}_(\\d+)(?:_(\\d+))?(?:_[A-Za-z]\\w*)?$`));
          if (made) {
            cell = { col: Number(made[1]), row: made[2] === undefined ? 0 : Number(made[2]) };
          }
        } else if (WHERE.test(masked[i])) {
          whereLine = i;
        } else if (!seenTemplate && PROPERTY.test(masked[i])) {
          lastProperty = i;
        }
      }
      depth += braceDelta(masked[i]);
    }
    if (!cell) {
      continue;
    }
    const keep = `(col != ${cell.col} || row != ${cell.row})`;
    const out = [...lines];
    if (whereLine >= 0) {
      const where = lines[whereLine].match(WHERE);
      if (where) {
        out[whereLine] = `${where[1]}where: (${where[2]}) && ${keep}`;
        return out;
      }
    }
    out.splice(lastProperty + 1, 0, `${header[1]}  where: ${keep}`);
    return out;
  }
  return null;
}

const USE_HEADER = /^\s*Use\s+([A-Za-z_]\w*)\s*:/;

// The Use that made a block, as the blocks of a Use are named after it: `oak_trunk` is made by `Use oak`.
export function findUseBlock(lines: string[], id: string): { start: number; end: number } | null {
  const masked = maskLines(lines);
  if (masked === null) {
    return null;
  }
  let found: { start: number; end: number; length: number } | null = null;
  for (let start = 0; start < masked.length; start++) {
    const header = masked[start].match(USE_HEADER);
    if (header && id.startsWith(`${header[1]}_`) && (found === null || header[1].length > found.length)) {
      found = { start, end: blockEndLine(lines, start), length: header[1].length };
    }
  }
  return found && { start: found.start, end: found.end };
}
