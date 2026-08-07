// Shared SVG geometry for the "Pattern" color kind (hachure/cross-hatch/
// dots) - same recipe as the main app's shared/ui/ColorPicker/utils/
// patternFill.ts, minus the Canvas/Konva raster-tile generator (this
// package is headless - it only ever emits SVG, never draws to a live
// canvas), so a chart round-tripped through this package renders the same
// pattern tile the main app's own SVG export produces.
//
// Angle is restricted to 0/45/90/135 (PatternColor['angle']) - the only
// line directions a small repeating SQUARE tile can express as a single
// edge-to-edge or corner-to-corner segment, which then continues
// seamlessly into the next tile with no visible seam when repeated.
import type { PatternStyle } from '../model/colors';

export interface PatternConfig {
  pattern: PatternStyle;
  color: string;
  spacing: number;
  strokeWidth: number;
  angle: 0 | 45 | 90 | 135;
}

const xml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One tile's line segment(s), in local 0..size tile coordinates. */
function tileSegments(pattern: PatternStyle, angle: number, size: number): Array<[number, number, number, number]> {
  const at = (deg: number): [number, number, number, number] =>
    deg === 0 ? [0, 0, size, 0]
      : deg === 90 ? [0, 0, 0, size]
        : deg === 135 ? [0, 0, size, size]
          : [0, size, size, 0]; // 45 (default)
  if (pattern === 'cross-hatch') return [at(angle), at((angle + 90) % 180)];
  return [at(angle)];
}

/** Tile size in px - never smaller than a few px regardless of a tiny spacing value. */
export function patternTileSize(config: PatternConfig): number {
  return Math.max(3, config.spacing);
}

/** SVG `<pattern>` def markup (no wrapping `<defs>`) for the given id. */
export function patternSvgMarkup(id: string, config: PatternConfig): string {
  const size = patternTileSize(config);
  const strokeWidth = Math.max(.5, config.strokeWidth);
  const color = xml(config.color);
  const body = config.pattern === 'dots'
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${strokeWidth}" fill="${color}"/>`
    : tileSegments(config.pattern, config.angle, size)
      .map(([x1, y1, x2, y2]) => `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`)
      .join('');
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">${body}</pattern>`;
}
