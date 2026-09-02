import type { ChartRamp } from '../../model/charts';
import { interpolateHexColorStops } from '../../model/colorInterpolation';

const RAMP_FALLBACK_COLOR = '#94a3b8';

export function colorAtRamp(ramp: ChartRamp | undefined, value: number): string {
  if (!ramp?.stops.length) {
    return RAMP_FALLBACK_COLOR;
  }

  return interpolateHexColorStops(ramp.stops, value);
}
