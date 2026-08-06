// Pure hex-binning geometry for the hexbin chart family: buckets a cloud of
// pixel-space points into a flat-top hexagonal grid and counts points per
// cell. Simple nearest-center rounding (no seam-correction neighbor check
// like d3-hexbin) - visually sufficient for a chart mark, not a statistics
// library.

export interface HexBin {
  cx: number;
  cy: number;
  count: number;
}

/** Bins pixel-space points into a flat-top hexagonal grid of the given
 * radius. Column spacing is 1.5x the radius (3/4 of the hex's vertex-to-
 * vertex width); odd columns are offset by half a row height so hexagons
 * tile without gaps. */
export function computeHexBins(points: Array<{ x: number; y: number }>, radius: number): HexBin[] {
  if (radius <= 0 || points.length === 0) return [];
  const dx = radius * 1.5;
  const dy = radius * Math.sqrt(3);
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
