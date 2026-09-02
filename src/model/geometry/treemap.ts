export interface TreemapRect<T> {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
}

function worst(rowValues: number[], length: number): number {
  const sum = rowValues.reduce((s, v) => s + v, 0);
  if (sum <= 0 || length <= 0) {
    return Infinity;
  }
  const max = Math.max(...rowValues),
    min = Math.min(...rowValues);
  return Math.max((length * length * max) / (sum * sum), (sum * sum) / (length * length * min));
}

export function squarifyTreemap<T extends { value: number }>(
  items: T[],
  x: number,
  y: number,
  width: number,
  height: number,
): TreemapRect<T>[] {
  const positive = items.filter(item => item.value > 0);
  if (!positive.length || width <= 0 || height <= 0) {
    return [];
  }
  const total = positive.reduce((s, item) => s + item.value, 0);
  if (total <= 0) {
    return [];
  }
  const scale = (width * height) / total;
  const sorted = [...positive].sort((a, b) => b.value - a.value);

  const results: TreemapRect<T>[] = [];
  let remaining = sorted;
  let rx = x,
    ry = y,
    rw = width,
    rh = height;

  while (remaining.length) {
    const length = Math.min(rw, rh);
    const row = [remaining[0]];
    let rowValues = [remaining[0].value * scale];
    let i = 1;
    while (i < remaining.length) {
      const candidateValues = [...rowValues, remaining[i].value * scale];
      if (worst(candidateValues, length) <= worst(rowValues, length)) {
        row.push(remaining[i]);
        rowValues = candidateValues;
        i++;
      } else {
        break;
      }
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
      rx += colWidth;
      rw -= colWidth;
    } else {
      const rowHeight = rw > 0 ? rowSum / rw : 0;
      let cx = rx;
      row.forEach((item, index) => {
        const itemWidth = rowHeight > 0 ? rowValues[index] / rowHeight : 0;
        results.push({ item, x: cx, y: ry, width: itemWidth, height: rowHeight });
        cx += itemWidth;
      });
      ry += rowHeight;
      rh -= rowHeight;
    }
  }

  return results;
}
