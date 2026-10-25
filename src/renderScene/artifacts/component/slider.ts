import type { GenericComponent } from '../../../model/component';
import { sliderReach } from '../../../model/component/sliderReach';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty, type ControlBox } from './controlParts';

const HANDLE_WIDTH = 4;
const TEXT_PADDING = 12;
const TICK_LENGTH = 5;
const TICK_THICKNESS = 1.5;

interface Shape {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

function decimals(step: number): number {
  return step > 0 ? (String(step).split('.')[1]?.length ?? 0) : 0;
}

function readout(component: GenericComponent, fraction: number): string {
  const display = textProperty(component, 'display');
  if (display === 'percent') {
    return `${Math.round(fraction * 100)}%`;
  }
  return display === 'value' ? Number(component.value).toFixed(decimals(numberProperty(component, 'step'))) : '';
}

const rect = (component: GenericComponent, box: ControlBox, part: string, order: number, shape: Shape, color: string, extra: object = {}): RenderNode =>
  ({
    id: `widget-${component.id}-${part}`,
    type: 'rect',
    order: box.order + order,
    bounds: rotatedBounds(shape, 0, 0),
    ...shape,
    style: fade(component, { fill: solid(color), stroke: { kind: 'none' }, ...extra }),
  }) as RenderNode;

// The marks along a slider: one at each end and the others between them, as far from the line as `offset`.
function ticks(component: GenericComponent, box: ControlBox, vertical: boolean, reach: number, offset: number): RenderNode[] {
  const count = Math.round(numberProperty(component, 'ticks'));
  const color = textProperty(component, 'tickColor');
  return Array.from({ length: count >= 2 ? count : 0 }, (_, index) => {
    const t = index / (count - 1);
    const shape = vertical
      ? { x: box.x + offset, y: box.y + box.height - reach - t * (box.height - reach * 2) - TICK_THICKNESS / 2, width: TICK_LENGTH, height: TICK_THICKNESS, rx: TICK_THICKNESS / 2 }
      : { x: box.x + reach + t * (box.width - reach * 2) - TICK_THICKNESS / 2, y: box.y + offset, width: TICK_THICKNESS, height: TICK_LENGTH, rx: TICK_THICKNESS / 2 };
    return rect(component, box, `tick-${index}`, 0.15, shape, color);
  });
}

// A line with a round thumb on it, along the width or, upright, along the height.
function buildLine(component: GenericComponent, box: ControlBox, fraction: number, vertical: boolean): RenderNode[] {
  const reach = sliderReach('line', vertical ? box.width : box.height);
  const radius = (reach * numberProperty(component, 'thumbSize')) / 100;
  const thickness = Math.min(numberProperty(component, 'trackHeight'), vertical ? box.width : box.height);
  const centerX = vertical ? box.x + box.width / 2 : box.x + reach + fraction * (box.width - reach * 2);
  const centerY = vertical ? box.y + box.height - reach - fraction * (box.height - reach * 2) : box.y + box.height / 2;
  const line = (length: number, from: number): Shape =>
    vertical
      ? { x: centerX - thickness / 2, y: from, width: thickness, height: length, rx: thickness / 2 }
      : { x: from, y: centerY - thickness / 2, width: length, height: thickness, rx: thickness / 2 };
  const whole = vertical ? line(box.height, box.y) : line(box.width, box.x);
  const filled = vertical ? line(box.y + box.height - centerY, centerY) : line(centerX - box.x, box.x);
  return [
    rect(component, box, 'track', 0.1, whole, textProperty(component, 'track')),
    ...ticks(component, box, vertical, reach, vertical ? box.width / 2 + thickness / 2 + 5 : box.height / 2 + thickness / 2 + 5),
    rect(component, box, 'fill', 0.2, filled, textProperty(component, 'accent')),
    {
      id: `widget-${component.id}-thumb`,
      type: 'ellipse',
      order: box.order + 0.3,
      bounds: rotatedBounds({ x: centerX - radius, y: centerY - radius, width: radius * 2, height: radius * 2 }, 0, 0),
      cx: centerX,
      cy: centerY,
      rx: radius,
      ry: radius,
      style: fade(component, {
        fill: solid(textProperty(component, 'thumb')),
        stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: 0.25, blur: 3, dx: 0, dy: 1 },
      }),
    },
  ];
}

// A field that fills up to the value, with a thin handle at its end. Along the width it has the label at the left and the value at the
// right, upright it fills from below and has the value at the top.
function buildField(component: GenericComponent, box: ControlBox, fraction: number, vertical: boolean): RenderNode[] {
  const reach = sliderReach('field', vertical ? box.width : box.height);
  const radius = Math.min(numberProperty(component, 'radius'), Math.min(box.width, box.height) / 2);
  const whole: Shape = { x: box.x, y: box.y, width: box.width, height: box.height, rx: radius };
  const handleAt = vertical ? box.y + box.height - reach - fraction * (box.height - reach * 2) : box.x + reach + fraction * (box.width - reach * 2);
  const filled: Shape = vertical
    ? { ...whole, y: handleAt - HANDLE_WIDTH / 2, height: Math.max(0, box.y + box.height - handleAt + HANDLE_WIDTH / 2) }
    : { ...whole, width: Math.max(0, handleAt + HANDLE_WIDTH / 2 - box.x) };
  const handleLength = (vertical ? box.width : box.height) * 0.5;
  const handle: Shape = vertical
    ? { x: box.x + (box.width - handleLength) / 2, y: handleAt - HANDLE_WIDTH / 2, width: handleLength, height: HANDLE_WIDTH, rx: HANDLE_WIDTH / 2 }
    : { x: handleAt - HANDLE_WIDTH / 2, y: box.y + (box.height - handleLength) / 2, width: HANDLE_WIDTH, height: handleLength, rx: HANDLE_WIDTH / 2 };
  const nodes = [
    rect(component, box, 'track', 0.1, whole, textProperty(component, 'surface')),
    rect(component, box, 'fill', 0.2, filled, textProperty(component, 'fill')),
    rect(component, box, 'handle', 0.3, handle, textProperty(component, 'accent')),
  ];
  const text = { color: ink(component, textProperty(component, 'textColor')), fontSize: numberProperty(component, 'fontSize') };
  const value = readout(component, fraction);
  if (vertical) {
    if (value) {
      nodes.push(labelText(component, 'value', { x: box.x, y: box.y + 6, width: box.width, height: 20 }, { ...text, text: value, align: 'center' }, box.order + 0.4));
    }
    return nodes;
  }
  const inner = { y: box.y, height: box.height, width: Math.max(0, box.width / 2 - TEXT_PADDING) };
  if (component.label) {
    nodes.push(labelText(component, 'label', { x: box.x + TEXT_PADDING, ...inner }, { ...text, text: component.label, align: 'left' }, box.order + 0.4));
  }
  if (value) {
    nodes.push(labelText(component, 'value', { x: box.x + box.width / 2, ...inner }, { ...text, text: value, align: 'right' }, box.order + 0.4));
  }
  nodes.push(...ticks(component, box, false, reach, box.height - TICK_LENGTH - 5));
  return nodes;
}

export function buildSlider(component: GenericComponent, index: number): RenderNode[] {
  const field = textProperty(component, 'variant') === 'field';
  const vertical = textProperty(component, 'direction') === 'vertical';
  const fallback = vertical ? { width: field ? 56 : 28, height: 180 } : { width: 220, height: field ? 36 : 28 };
  const box = controlBox(component, index, fallback);
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const fraction = Math.min(1, Math.max(0, (Number(component.value) - min) / (max - min || 1)));
  return [hitArea(component, box), ...(field ? buildField(component, box, fraction, vertical) : buildLine(component, box, fraction, vertical))];
}
