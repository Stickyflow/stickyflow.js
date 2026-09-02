import type { BlockKind } from '../ast';

export function emitComposition(composition: string[], kinds: Map<string, BlockKind>): string {
  if (!composition.length) {
    return '';
  }

  const styles = composition.filter(reference => kinds.get(reference) === 'Style');
  const layouts = composition.filter(reference => kinds.get(reference) === 'Layout');
  const unresolved = composition.filter(reference => {
    const kind = kinds.get(reference);
    return kind !== 'Style' && kind !== 'Layout';
  });

  return ` : ${[...styles, ...layouts, ...unresolved].join(' & ')}`;
}
