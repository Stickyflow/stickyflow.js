import type { Link, MarkerType } from '../../../model/link';

export function markerForEnd(link: Link, end: 'start' | 'end'): MarkerType {
  const explicit = end === 'start' ? link.startMarker : link.endMarker;
  if (explicit) {
    return explicit;
  }
  const direction = link.style?.arrowDirection ?? 'forward';
  if (direction === 'bidirectional') {
    return 'arrow';
  }
  if (end === 'start' && direction === 'backward') {
    return 'arrow';
  }
  if (end === 'end' && direction === 'forward') {
    return 'arrow';
  }
  return 'none';
}
