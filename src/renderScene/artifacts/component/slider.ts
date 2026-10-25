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

// Where the thumbs are, as fractions of the range. A slider has one, and the fill runs from the start up to it. A range has two, and the
// fill runs between them.
interface Thumbs {
  from: number;
  to: number;
  values: number[];
  two: boolean;
}

function decimals(step: number): number {
  return step > 0 ? (String(step).split('.')[1]?.length ?? 0) : 0;
}

function readout(component: GenericComponent, thumbs: Thumbs): string {
  const display = textProperty(component, 'display');
  const places = decimals(numberProperty(component, 'step'));
  const parts =
    display === 'percent'
      ? thumbs.two
        ? [thumbs.from, thumbs.to].map(fraction => `${Math.round(fraction * 100)}%`)
        : [`${Math.round(thumbs.to * 100)}%`]
      : display === 'value'
        ? thumbs.values.map(value => value.toFixed(places))
        : [];
  return parts.join(' – ');
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
function buildLine(component: GenericComponent, box: ControlBox, thumbs: Thumbs, vertical: boolean): RenderNode[] {
  const reach = sliderReach('line', vertical ? box.width : box.height);
  const radius = (reach * numberProperty(component, 'thumbSize')) / 100;
  const thickness = Math.min(numberProperty(component, 'trackHeight'), vertical ? box.width : box.height);
  const mid = vertical ? box.x + box.width / 2 : box.y + box.height / 2;
  // The position of a fraction along the line.
  const along = (fraction: number) => (vertical ? box.y + box.height - reach - fraction * (box.height - reach * 2) : box.x + reach + fraction * (box.width - reach * 2));
  const line = (start: number, end: number): Shape =>
    vertical
      ? { x: mid - thickness / 2, y: Math.min(start, end), width: thickness, height: Math.abs(end - start), rx: thickness / 2 }
      : { x: Math.min(start, end), y: mid - thickness / 2, width: Math.abs(end - start), height: thickness, rx: thickness / 2 };
  const whole = vertical ? line(box.y, box.y + box.height) : line(box.x, box.x + box.width);
  const filled = line(thumbs.two ? along(thumbs.from) : vertical ? box.y + box.height : box.x, along(thumbs.to));
  const thumb = (part: string, fraction: number, order: number): RenderNode => {
    const cx = vertical ? mid : along(fraction);
    const cy = vertical ? along(fraction) : mid;
    return {
      id: `widget-${component.id}-${part}`,
      type: 'ellipse',
      order: box.order + order,
      bounds: rotatedBounds({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }, 0, 0),
      cx,
      cy,
      rx: radius,
      ry: radius,
      style: fade(component, {
        fill: solid(textProperty(component, 'thumb')),
        stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: 0.25, blur: 3, dx: 0, dy: 1 },
      }),
    };
  };
  return [
    rect(component, box, 'track', 0.1, whole, textProperty(component, 'track')),
    ...ticks(component, box, vertical, reach, vertical ? box.width / 2 + thickness / 2 + 5 : box.height / 2 + thickness / 2 + 5),
    rect(component, box, 'fill', 0.2, filled, textProperty(component, 'accent')),
    ...(thumbs.two ? [thumb('thumb-start', thumbs.from, 0.3)] : []),
    thumb(thumbs.two ? 'thumb-end' : 'thumb', thumbs.to, 0.31),
  ];
}

// A field that fills up to the value, with a thin handle at its end. Along the width it has the label at the left and the value at the
// right, upright it fills from below and has the value at the top.
function buildField(component: GenericComponent, box: ControlBox, thumbs: Thumbs, vertical: boolean): RenderNode[] {
  const reach = sliderReach('field', vertical ? box.width : box.height);
  const radius = Math.min(numberProperty(component, 'radius'), Math.min(box.width, box.height) / 2);
  const whole: Shape = { x: box.x, y: box.y, width: box.width, height: box.height, rx: radius };
  const along = (fraction: number) => (vertical ? box.y + box.height - reach - fraction * (box.height - reach * 2) : box.x + reach + fraction * (box.width - reach * 2));
  const start = thumbs.two ? along(thumbs.from) : vertical ? box.y + box.height : box.x;
  const end = along(thumbs.to);
  const first = Math.min(start, end) - (thumbs.two ? HANDLE_WIDTH / 2 : 0);
  const last = Math.max(start, end) + HANDLE_WIDTH / 2;
  const filled: Shape = vertical
    ? { ...whole, y: thumbs.two ? first : end - HANDLE_WIDTH / 2, height: thumbs.two ? last - first : Math.max(0, box.y + box.height - end + HANDLE_WIDTH / 2), rx: thumbs.two ? 0 : radius }
    : { ...whole, x: thumbs.two ? first : box.x, width: thumbs.two ? last - first : Math.max(0, end + HANDLE_WIDTH / 2 - box.x), rx: thumbs.two ? 0 : radius };
  const handleLength = (vertical ? box.width : box.height) * 0.5;
  const handle = (part: string, at: number): RenderNode => {
    const shape: Shape = vertical
      ? { x: box.x + (box.width - handleLength) / 2, y: at - HANDLE_WIDTH / 2, width: handleLength, height: HANDLE_WIDTH, rx: HANDLE_WIDTH / 2 }
      : { x: at - HANDLE_WIDTH / 2, y: box.y + (box.height - handleLength) / 2, width: HANDLE_WIDTH, height: handleLength, rx: HANDLE_WIDTH / 2 };
    return rect(component, box, part, 0.3, shape, textProperty(component, 'accent'));
  };
  const nodes = [
    rect(component, box, 'track', 0.1, whole, textProperty(component, 'surface')),
    rect(component, box, 'fill', 0.2, filled, textProperty(component, 'fill')),
    ...(thumbs.two ? [handle('handle-start', start)] : []),
    handle(thumbs.two ? 'handle-end' : 'handle', end),
  ];
  const text = { color: ink(component, textProperty(component, 'textColor')), fontSize: numberProperty(component, 'fontSize') };
  const value = readout(component, thumbs);
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

// The `slider` and the `range` share their look: the range has a second thumb, which its property `valueEnd` sets.
export function buildSlider(component: GenericComponent, index: number): RenderNode[] {
  const field = textProperty(component, 'variant') === 'field';
  const vertical = textProperty(component, 'direction') === 'vertical';
  const fallback = vertical ? { width: field ? 56 : 28, height: 180 } : { width: 220, height: field ? 36 : 28 };
  const box = controlBox(component, index, fallback);
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const fractionOf = (value: number) => Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
  const two = component.type === 'range';
  const low = Number(component.value);
  const high = two ? Number(component.properties.valueEnd ?? max) : low;
  const thumbs: Thumbs = { from: fractionOf(two ? Math.min(low, high) : min), to: fractionOf(two ? Math.max(low, high) : low), values: two ? [Math.min(low, high), Math.max(low, high)] : [low], two };
  return [hitArea(component, box), ...(field ? buildField(component, box, thumbs, vertical) : buildLine(component, box, thumbs, vertical))];
}
