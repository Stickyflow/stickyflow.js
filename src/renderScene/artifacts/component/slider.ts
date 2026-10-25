import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, numberProperty, solid, textProperty } from './controlParts';

export function buildSlider(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 220, height: 28 });
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const fraction = Math.min(1, Math.max(0, (Number(component.value) - min) / (max - min || 1)));
  const reach = box.height / 2;
  const centerX = box.x + reach + fraction * (box.width - reach * 2);
  const centerY = box.y + box.height / 2;
  const radius = (reach * numberProperty(component, 'thumbSize')) / 100;
  const thickness = Math.min(numberProperty(component, 'trackHeight'), box.height);
  const trackY = centerY - thickness / 2;
  const bar = (part: string, order: number, width: number, color: string): RenderNode => ({
    id: `widget-${component.id}-${part}`,
    type: 'rect',
    order: box.order + order,
    bounds: rotatedBounds({ x: box.x, y: trackY, width, height: thickness }, 0, 0),
    x: box.x,
    y: trackY,
    width,
    height: thickness,
    rx: thickness / 2,
    style: fade(component, { fill: solid(color), stroke: { kind: 'none' } }),
  });
  return [
    hitArea(component, box),
    bar('track', 0.1, box.width, textProperty(component, 'track')),
    bar('fill', 0.2, centerX - box.x, textProperty(component, 'accent')),
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
