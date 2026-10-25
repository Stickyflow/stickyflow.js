import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty } from './controlParts';

const DOT_RATIO = 0.62;

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

// A dial: an arc that fills up to the value, a face in the middle with the value on it, and a dot on the arc where the value is.
export function buildKnob(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 96, height: 96 });
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const fraction = Math.min(1, Math.max(0, (Number(component.value) - min) / (max - min || 1)));
  const start = numberProperty(component, 'start');
  const sweep = Math.min(360, Math.max(1, numberProperty(component, 'sweep')));
  const thickness = Math.min(numberProperty(component, 'thickness'), Math.min(box.width, box.height) / 3);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const radius = Math.max(1, Math.min(box.width, box.height) / 2 - thickness / 2);
  const circumference = 2 * Math.PI * radius;
  const round = textProperty(component, 'rounded') !== 'false';
  // The angles are counted counterclockwise from the east, as on a plain, and the arc runs clockwise from `start`.
  const angle = ((start - fraction * sweep) * Math.PI) / 180;
  const arc = (part: string, order: number, color: string, length: number, extra: object = {}): RenderNode =>
    ({
      id: `widget-${component.id}-${part}`,
      type: 'ellipse',
      order: box.order + order,
      bounds: rotatedBounds({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }, 0, thickness),
      cx,
      cy,
      rx: radius,
      ry: radius,
      rotation: -start,
      style: fade(component, {
        fill: { kind: 'none' },
        stroke: solid(color),
        strokeWidth: thickness,
        dash: [Math.max(0.001, length), circumference],
        lineCap: round ? 'round' : 'butt',
        ...extra,
      }),
    }) as RenderNode;
  const faceRadius = Math.max(1, radius - thickness / 2 - Math.max(2, thickness * 0.4));
  const dotRadius = (thickness / 2) * DOT_RATIO + 1;
  const nodes: RenderNode[] = [
    hitArea(component, box),
    arc('track', 0.1, textProperty(component, 'track'), (sweep / 360) * circumference),
    arc('fill', 0.2, textProperty(component, 'accent'), (fraction * sweep / 360) * circumference, { opacity: fraction > 0 ? 1 : 0 }),
    {
      id: `widget-${component.id}-face`,
      type: 'ellipse',
      order: box.order + 0.3,
      bounds: rotatedBounds({ x: cx - faceRadius, y: cy - faceRadius, width: faceRadius * 2, height: faceRadius * 2 }, 0, 0),
      cx,
      cy,
      rx: faceRadius,
      ry: faceRadius,
      style: fade(component, { fill: solid(textProperty(component, 'face')), stroke: { kind: 'none' } }),
    },
    {
      id: `widget-${component.id}-dot`,
      type: 'ellipse',
      order: box.order + 0.4,
      bounds: rotatedBounds({ x: cx + radius * Math.cos(angle) - dotRadius, y: cy - radius * Math.sin(angle) - dotRadius, width: dotRadius * 2, height: dotRadius * 2 }, 0, 0),
      cx: cx + radius * Math.cos(angle),
      cy: cy - radius * Math.sin(angle),
      rx: dotRadius,
      ry: dotRadius,
      style: fade(component, { fill: solid(textProperty(component, 'dot')), stroke: { kind: 'none' } }),
    },
  ];
  const text = readout(component, fraction);
  if (text) {
    const label = { text, color: ink(component, textProperty(component, 'textColor')), fontSize: numberProperty(component, 'fontSize'), align: 'center' } as const;
    nodes.push(labelText(component, 'value', { x: cx - faceRadius, y: cy - faceRadius, width: faceRadius * 2, height: faceRadius * 2 }, label, box.order + 0.5));
  }
  return nodes;
}
