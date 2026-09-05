import { SVG_NAMESPACE } from '../../domContract';
import { pixelForValue } from './scale';
import type { ChartValueDragState, ValueScale } from './types';

const FONT_SIZE = 11;
const PADDING_X = 7;
const HEIGHT = 18;
const GAP = 8;
const BACKGROUND = 'rgba(15, 23, 42, 0.9)';

function element<K extends keyof SVGElementTagNameMap>(svg: SVGSVGElement, tag: K): SVGElementTagNameMap[K] {
  return svg.ownerDocument.createElementNS(SVG_NAMESPACE, tag) as SVGElementTagNameMap[K];
}

export function createValueReadout(svg: SVGSVGElement): SVGGElement {
  const group = element(svg, 'g');
  group.setAttribute('data-sf-value-readout', '');
  group.setAttribute('pointer-events', 'none');

  const background = element(svg, 'rect');
  background.setAttribute('rx', '4');
  background.setAttribute('fill', BACKGROUND);
  group.appendChild(background);

  const label = element(svg, 'text');
  label.setAttribute('fill', '#ffffff');
  label.setAttribute('font-size', String(FONT_SIZE));
  label.setAttribute('font-family', 'Inter, system-ui, sans-serif');
  label.setAttribute('font-weight', '600');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'central');
  group.appendChild(label);

  svg.appendChild(group);
  return group;
}

export function markAnchorX(drag: ChartValueDragState): number {
  if (drag.isBar) {
    const x = Number(drag.element.getAttribute('x'));
    const width = Number(drag.element.getAttribute('width'));
    return Number.isFinite(x) && Number.isFinite(width) ? x + width / 2 : 0;
  }
  const cx = Number(drag.element.getAttribute('cx'));
  return Number.isFinite(cx) ? cx : 0;
}

export interface ReadoutAnchor {
  centerX: number;
  scale: ValueScale;
}

function formatValue(value: number): string {
  return String(Math.round(value * 10) / 10);
}

// A width from the live value's own string length flips every time rounding
// crosses a decimal boundary (60 <-> 60.1), resizing the box every frame the
// mouse jitters near that boundary. The scale is fixed for the whole drag, so
// sizing from its worst-case digit count keeps the box a constant size.
function readoutWidth(scale: ValueScale): number {
  const magnitude = Math.max(Math.abs(scale.min), Math.abs(scale.max));
  const sign = scale.min < 0 ? 1 : 0;
  const chars = sign + formatValue(magnitude).length + 2; // + '.' + one decimal digit, always reserved
  return Math.max(28, (chars * FONT_SIZE) / 1.7 + PADDING_X * 2);
}

export function updateValueReadout(readout: SVGGElement, anchor: ReadoutAnchor, value: number): void {
  const text = readout.querySelector('text');
  const background = readout.querySelector('rect');
  if (!text || !background) {
    return;
  }

  text.textContent = formatValue(value);
  const width = readoutWidth(anchor.scale);

  const markY = pixelForValue(value, anchor.scale);
  const above = markY - GAP - HEIGHT >= anchor.scale.plotY;
  const top = above ? markY - GAP - HEIGHT : markY + GAP;
  const centerX = anchor.centerX;

  background.setAttribute('x', String(centerX - width / 2));
  background.setAttribute('y', String(top));
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(HEIGHT));
  text.setAttribute('x', String(centerX));
  text.setAttribute('y', String(top + HEIGHT / 2));
}

export function removeValueReadout(readout: SVGGElement | null): void {
  readout?.remove();
}
