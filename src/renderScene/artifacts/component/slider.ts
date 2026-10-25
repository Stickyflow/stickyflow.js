import type { GenericComponent } from '../../../model/component';
import { sliderReach } from '../../../model/component/sliderReach';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty, type ControlBox } from './controlParts';

const HANDLE_WIDTH = 4;
const TEXT_PADDING = 12;

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

const rect = (component: GenericComponent, box: ControlBox, part: string, order: number, shape: { x: number; y: number; width: number; height: number; rx: number }, color: string, extra: object = {}): RenderNode =>
  ({
    id: `widget-${component.id}-${part}`,
    type: 'rect',
    order: box.order + order,
    bounds: rotatedBounds(shape, 0, 0),
    ...shape,
    style: fade(component, { fill: solid(color), stroke: { kind: 'none' }, ...extra }),
  }) as RenderNode;

// A line with a round thumb on it.
function buildLine(component: GenericComponent, box: ControlBox, fraction: number): RenderNode[] {
  const reach = sliderReach('line', box.height);
  const centerX = box.x + reach + fraction * (box.width - reach * 2);
  const centerY = box.y + box.height / 2;
  const radius = (reach * numberProperty(component, 'thumbSize')) / 100;
  const thickness = Math.min(numberProperty(component, 'trackHeight'), box.height);
  const line = (width: number) => ({ x: box.x, y: centerY - thickness / 2, width, height: thickness, rx: thickness / 2 });
  return [
    rect(component, box, 'track', 0.1, line(box.width), textProperty(component, 'track')),
    rect(component, box, 'fill', 0.2, line(centerX - box.x), textProperty(component, 'accent')),
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

// A field that fills up to the value, with a thin handle at its end, the label at the left and the value at the right.
function buildField(component: GenericComponent, box: ControlBox, fraction: number): RenderNode[] {
  const reach = sliderReach('field', box.height);
  const handleX = box.x + reach + fraction * (box.width - reach * 2);
  const radius = Math.min(numberProperty(component, 'radius'), box.height / 2);
  const whole = { x: box.x, y: box.y, width: box.width, height: box.height, rx: radius };
  const handleHeight = box.height * 0.5;
  const nodes = [
    rect(component, box, 'track', 0.1, whole, textProperty(component, 'surface')),
    rect(component, box, 'fill', 0.2, { ...whole, width: Math.max(0, handleX + HANDLE_WIDTH / 2 - box.x) }, textProperty(component, 'fill')),
    rect(component, box, 'handle', 0.3, { x: handleX - HANDLE_WIDTH / 2, y: box.y + (box.height - handleHeight) / 2, width: HANDLE_WIDTH, height: handleHeight, rx: HANDLE_WIDTH / 2 }, textProperty(component, 'accent')),
  ];
  const text = { color: ink(component, textProperty(component, 'textColor')), fontSize: numberProperty(component, 'fontSize') };
  const inner = { y: box.y, height: box.height, width: Math.max(0, box.width / 2 - TEXT_PADDING) };
  if (component.label) {
    nodes.push(labelText(component, 'label', { x: box.x + TEXT_PADDING, ...inner }, { ...text, text: component.label, align: 'left' }, box.order + 0.4));
  }
  const value = readout(component, fraction);
  if (value) {
    nodes.push(labelText(component, 'value', { x: box.x + box.width / 2, ...inner }, { ...text, text: value, align: 'right' }, box.order + 0.4));
  }
  return nodes;
}

export function buildSlider(component: GenericComponent, index: number): RenderNode[] {
  const field = textProperty(component, 'variant') === 'field';
  const box = controlBox(component, index, field ? { width: 220, height: 36 } : { width: 220, height: 28 });
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const fraction = Math.min(1, Math.max(0, (Number(component.value) - min) / (max - min || 1)));
  return [hitArea(component, box), ...(field ? buildField(component, box, fraction) : buildLine(component, box, fraction))];
}
