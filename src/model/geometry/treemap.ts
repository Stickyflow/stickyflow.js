// Pure squarified-treemap geometry (Bruls/Huizing/van Wijk algorithm), ported
// from stickyflow-atlas's entities/charts/ui/treemap.ts: tiles a rectangle
// into sub-rectangles whose areas are proportional to each item's value,
// keeping tiles as close to square as possible (rather than simple
// horizontal/vertical slicing, which degenerates into thin slivers for
// skewed value distributions). No chart-specific knowledge - just numbers
// in, rectangles out.

export interface TreemapRect<T> {
  item: T;
  x: number; y: number; width: number; height: number;
}

function worst(rowValues: number[], length: number): number {
  const sum = rowValues.reduce((s, v) => s + v, 0);
  if (sum <= 0 || length <= 0) return Infinity;
  const max = Math.max(...rowValues), min = Math.min(...rowValues);
  return Math.max((length * length * max) / (sum * sum), (sum * sum) / (length * length * min));
}

/** Lays out `items` (each carrying a positive `.value`) into `width x height`
 *  starting at `(x, y)`. Values are internally rescaled so they sum to
 *  exactly width*height - callers pass raw values, not pre-normalized ones. */
export function squarifyTreemap<T extends { value: number }>(items: T[], x: number, y: number, width: number, height: number): TreemapRect<T>[] {
  const positive = items.filter(item => item.value > 0);
  if (!positive.length || width <= 0 || height <= 0) return [];
  const total = positive.reduce((s, item) => s + item.value, 0);
  if (total <= 0) return [];
  const scale = (width * height) / total;
  const sorted = [...positive].sort((a, b) => b.value - a.value);

  const results: TreemapRect<T>[] = [];
  let remaining = sorted;
  let rx = x, ry = y, rw = width, rh = height;

  while (remaining.length) {
    const length = Math.min(rw, rh);
    let row = [remaining[0]];
    let rowValues = [remaining[0].value * scale];
    let i = 1;
    while (i < remaining.length) {
      const candidateValues = [...rowValues, remaining[i].value * scale];
      if (worst(candidateValues, length) <= worst(rowValues, length)) { row.push(remaining[i]); rowValues = candidateValues; i++; }
      else break;
    }
    remaining = remaining.slice(row.length);
    const rowSum = rowValues.reduce((s, v) => s + v, 0);

    if (rw >= rh) {
      const colWidth = rh > 0 ? rowSum / rh : 0;
      let cy = ry;
      row.forEach((item, index) => {
        const itemHeight = colWidth > 0 ? rowValues[index] / colWidth : 0;
        results.push({ item, x: rx, y: cy, width: colWidth, height: itemHeight });
        cy += itemHeight;
      });
      rx += colWidth; rw -= colWidth;
    } else {
      const rowHeight = rw > 0 ? rowSum / rw : 0;
      let cx = rx;
      row.forEach((item, index) => {
        const itemWidth = rowHeight > 0 ? rowValues[index] / rowHeight : 0;
        results.push({ item, x: cx, y: ry, width: itemWidth, height: rowHeight });
        cx += itemWidth;
      });
      ry += rowHeight; rh -= rowHeight;
    }
  }

  return results;
}
