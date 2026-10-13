import { roundedBarPath } from './barShape';

export interface SegmentFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A bar drawn as separate segments along its length: left to right for horizontal bars, bottom to top
// for vertical ones. fraction is how much of the full length is filled (1 for a track).
export function segmentedBarPath(
  frame: SegmentFrame,
  orientation: 'horizontal' | 'vertical',
  count: number,
  gap: number,
  radius: number,
  fraction: number,
  snap: boolean,
): string {
  const horizontal = orientation === 'horizontal';
  const length = horizontal ? frame.width : frame.height;
  const segment = Math.max(1, (length - gap * (count - 1)) / count);
  const filled = Math.min(count, Math.max(0, fraction * count));
  const units = snap ? Math.round(filled) : filled;
  const parts: string[] = [];
  for (let index = 0; index < count; index++) {
    const visible = Math.min(1, Math.max(0, units - index)) * segment;
    if (visible < 0.5) {
      continue;
    }
    const offset = index * (segment + gap);
    parts.push(
      horizontal
        ? roundedBarPath(frame.x + offset, frame.y, visible, frame.height, radius)
        : roundedBarPath(frame.x, frame.y + frame.height - offset - visible, frame.width, visible, radius),
    );
  }
  return parts.join(' ');
}
