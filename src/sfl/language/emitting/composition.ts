export function emitComposition(composition: string[]): string {
  if (!composition.length) {
    return '';
  }
  return ` : ${composition.join(' & ')}`;
}
