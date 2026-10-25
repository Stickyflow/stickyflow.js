import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty } from './controlParts';

function readout(component: GenericComponent, fraction: number): string {
  const display = textProperty(component, 'display');
  if (display === 'percent') {
    return `${Math.round(fraction * 100)}%`;
  }
  return display === 'value' ? String(Number(component.value)) : '';
}

export function buildProgress(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 220, height: 12 });
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const fraction = Math.min(1, Math.max(0, (Number(component.value) - min) / (max - min || 1)));
  const round = textProperty(component, 'rounded') !== 'false';
  const nodes: RenderNode[] = [hitArea(component, box)];

  if (textProperty(component, 'variant') === 'ring') {
    const thickness = Math.min(numberProperty(component, 'thickness'), Math.min(box.width, box.height) / 2);
    const radius = Math.max(1, Math.min(box.width, box.height) / 2 - thickness / 2);
    const circumference = 2 * Math.PI * radius;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const ring = (part: string, order: number, color: string, extra: object): RenderNode =>
      ({
        id: `widget-${component.id}-${part}`,
        type: 'ellipse',
        order: box.order + order,
        bounds: rotatedBounds({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }, 0, thickness),
        cx,
        cy,
        rx: radius,
        ry: radius,
        rotation: -90,
        style: fade(component, { fill: { kind: 'none' }, stroke: solid(color), strokeWidth: thickness, ...extra }),
      }) as RenderNode;
    nodes.push(ring('track', 0.1, textProperty(component, 'track'), {}));
    nodes.push(
      ring('fill', 0.2, textProperty(component, 'accent'), {
        dash: [Math.max(0.001, fraction * circumference), circumference],
        lineCap: round ? 'round' : 'butt',
        opacity: fraction > 0 ? 1 : 0,
      }),
    );
  } else {
    const vertical = textProperty(component, 'direction') === 'vertical';
    const radius = round ? (vertical ? box.width : box.height) / 2 : 0;
    // Upright it fills from below.
    const bar = (part: string, order: number, length: number, color: string, opacity?: number): RenderNode => {
      const shape = vertical
        ? { x: box.x, y: box.y + box.height - length, width: box.width, height: length }
        : { x: box.x, y: box.y, width: length, height: box.height };
      return {
        id: `widget-${component.id}-${part}`,
        type: 'rect',
        order: box.order + order,
        bounds: rotatedBounds(shape, 0, 0),
        ...shape,
        rx: radius,
        style: fade(component, { fill: solid(color), stroke: { kind: 'none' }, ...(opacity === undefined ? {} : { opacity }) }),
      };
    };
    const full = vertical ? box.height : box.width;
    nodes.push(bar('track', 0.1, full, textProperty(component, 'track')));
    nodes.push(bar('fill', 0.2, Math.max(0, fraction * full), textProperty(component, 'accent'), fraction > 0 ? 1 : 0));
  }

  const text = readout(component, fraction);
  if (text) {
    const label = { text, color: ink(component, textProperty(component, 'textColor')), fontSize: numberProperty(component, 'fontSize'), align: 'center' } as const;
    nodes.push(labelText(component, 'value', box, label, box.order + 0.3));
  }
  return nodes;
}
