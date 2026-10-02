import type { RadarPoint } from '../../renderScene/charts/primitives/radarShape';
import { createValueReadout, formatReadoutValue, removeValueReadout } from '../chartValue/readout';

const GAP = 10;
const HEIGHT = 18;
const FONT_SIZE = 11;
const PADDING_X = 7;

export { createValueReadout, removeValueReadout };

export function positionRadarReadout(readout: SVGGElement, vertex: RadarPoint, centerY: number, value: number): void {
  const text = readout.querySelector('text');
  const background = readout.querySelector('rect');
  if (!text || !background) {
    return;
  }
  const label = formatReadoutValue(value);
  const width = Math.max(28, (label.length * FONT_SIZE) / 1.7 + PADDING_X * 2);
  const above = vertex.y <= centerY;
  const top = above ? vertex.y - GAP - HEIGHT : vertex.y + GAP;

  text.textContent = label;
  background.setAttribute('x', String(vertex.x - width / 2));
  background.setAttribute('y', String(top));
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(HEIGHT));
  text.setAttribute('x', String(vertex.x));
  text.setAttribute('y', String(top + HEIGHT / 2));
}
