export interface HexBin {
  cx: number;
  cy: number;
  count: number;
}

export function computeHexBins(points: Array<{ x: number; y: number }>, radius: number): HexBin[] {
  if (radius <= 0 || points.length === 0) return [];
  const dx = radius * 1.5,
    dy = radius * Math.sqrt(3);
  const bins = new Map<string, HexBin>();

  for (const { x, y } of points) {
    const col = Math.round(x / dx);
    const rowOffset = col % 2 !== 0 ? dy / 2 : 0;
    const row = Math.round((y - rowOffset) / dy);
    const key = `${col}:${row}`;
    const existing = bins.get(key);
    if (existing) existing.count++;
    else bins.set(key, { cx: col * dx, cy: row * dy + rowOffset, count: 1 });
  }

  return [...bins.values()];
}
