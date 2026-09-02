import type { LineRange } from '../scanner';

function containsRange(container: LineRange, candidate: LineRange): boolean {
  const sameRange = container.start === candidate.start && container.end === candidate.end;
  return !sameRange && container.start <= candidate.start && container.end >= candidate.end;
}

export function outermostRemovalRanges(ranges: LineRange[]): LineRange[] {
  return ranges.filter(
    candidate => !ranges.some(container => container !== candidate && containsRange(container, candidate)),
  );
}
