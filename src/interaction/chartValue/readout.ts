import { SVG_NAMESPACE } from '../../domContract';
import { pixelForValue } from './scale';
import type { ChartValueDragState } from './types';

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

function anchorX(drag: ChartValueDragState): number {
  if (drag.isBar) {
    const x = Number(drag.element.getAttribute('x'));
    const width = Number(drag.element.getAttribute('width'));
    return Number.isFinite(x) && Number.isFinite(width) ? x + width / 2 : 0;
  }
  const cx = Number(drag.element.getAttribute('cx'));
  return Number.isFinite(cx) ? cx : 0;
}

export function updateValueReadout(readout: SVGGElement, drag: ChartValueDragState, value: number): void {
  const text = readout.querySelector('text');
  const background = readout.querySelector('rect');
  if (!text || !background) {
    return;
  }

  text.textContent = String(Math.round(value * 10) / 10);
  const width = Math.max(28, (text.textContent.length * FONT_SIZE) / 1.7 + PADDING_X * 2);

  const markY = pixelForValue(value, drag.scale);
  const above = markY - GAP - HEIGHT >= drag.scale.plotY;
  const top = above ? markY - GAP - HEIGHT : markY + GAP;
  const centerX = anchorX(drag);

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
