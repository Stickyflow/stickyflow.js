import { SVG_NAMESPACE } from '../../dom';
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

export function markAnchorY(drag: ChartValueDragState): number {
  return drag.barTop + drag.barHeight / 2;
}

export function markAnchorX(drag: ChartValueDragState): number {
  if (drag.isBar) {
    return drag.barX + drag.barWidth / 2;
  }
  const cx = Number(drag.element.getAttribute('cx'));
  return Number.isFinite(cx) ? cx : 0;
}

export interface ReadoutAnchor {
  centerX: number;
  centerY?: number;
  scale: ValueScale;
}

export function formatReadoutValue(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function readoutWidth(scale: ValueScale): number {
  const magnitude = Math.max(Math.abs(scale.min), Math.abs(scale.max));
  const sign = scale.min < 0 ? 1 : 0;
  const chars = sign + formatReadoutValue(magnitude).length + 2;
  return Math.max(28, (chars * FONT_SIZE) / 1.7 + PADDING_X * 2);
}

export function updateValueReadout(readout: SVGGElement, anchor: ReadoutAnchor, value: number): void {
  const text = readout.querySelector('text');
  const background = readout.querySelector('rect');
  if (!text || !background) {
    return;
  }

  text.textContent = formatReadoutValue(value);
  const width = readoutWidth(anchor.scale);

  if (anchor.scale.horizontal) {
    const markX = pixelForValue(value, anchor.scale);
    const plotEnd = anchor.scale.plotY + anchor.scale.plotHeight;
    const left = markX + GAP + width <= plotEnd ? markX + GAP : markX - GAP - width;
    const centerY = anchor.centerY ?? 0;
    background.setAttribute('x', String(left));
    background.setAttribute('y', String(centerY - HEIGHT / 2));
    background.setAttribute('width', String(width));
    background.setAttribute('height', String(HEIGHT));
    text.setAttribute('x', String(left + width / 2));
    text.setAttribute('y', String(centerY));
    return;
  }

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
