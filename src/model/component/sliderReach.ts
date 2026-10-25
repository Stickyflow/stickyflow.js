// How far the center of the thumb of a slider stays from its ends, in the units of the component.
export function sliderReach(variant: unknown, height: number): number {
  return variant === 'field' ? Math.min(8, height / 2) : height / 2;
}
