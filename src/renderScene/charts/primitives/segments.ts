import { roundedBarPath } from './barShape';

export interface SegmentFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
