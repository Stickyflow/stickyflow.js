import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, solid, textProperty } from './controlParts';

const PADDING_RATIO = 0.12;

export function buildSwitch(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 52, height: 30 });
  const on = component.value === true;
  const padding = box.height * PADDING_RATIO;
  const radius = box.height / 2 - padding;
  const centerX = on ? box.x + box.width - box.height / 2 : box.x + box.height / 2;
  const thumb = { x: centerX - radius, y: box.y + padding, width: radius * 2, height: radius * 2 };
  return [
    hitArea(component, box),
    {
      id: `widget-${component.id}-track`,
      type: 'rect',
      order: box.order + 0.1,
      bounds: rotatedBounds(box, 0, 0),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rx: box.height / 2,
      style: fade(component, {
        fill: solid(textProperty(component, on ? 'accent' : 'track')),
        stroke: { kind: 'none' },
      }),
    },
    {
      id: `widget-${component.id}-thumb`,
      type: 'ellipse',
      order: box.order + 0.2,
      bounds: rotatedBounds(thumb, 0, 0),
      cx: centerX,
      cy: box.y + box.height / 2,
      rx: radius,
      ry: radius,
      style: fade(component, {
        fill: solid(textProperty(component, 'thumb')),
        stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: 0.25, blur: 2, dx: 0, dy: 1 },
      }),
    },
  ];
}
