import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty } from './controlParts';

export function buildSegmented(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 300, height: 40 });
  const options = textProperty(component, 'options')
    .split(',')
    .map(option => option.trim())
    .filter(Boolean);
  const count = Math.max(1, options.length);
  const active = Math.min(count - 1, Math.max(0, Math.round(Number(component.value)) || 0));
  const inset = Math.min(numberProperty(component, 'inset'), box.height / 2);
  const radius = Math.min(numberProperty(component, 'radius'), box.height / 2);
  const cellWidth = (box.width - inset * 2) / count;
  const cell = { y: box.y + inset, height: box.height - inset * 2 };
  const nodes: RenderNode[] = [
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
      rx: radius,
      style: fade(component, { fill: solid(textProperty(component, 'track')), stroke: { kind: 'none' } }),
    },
    {
      id: `widget-${component.id}-active`,
      type: 'rect',
      order: box.order + 0.2,
      bounds: rotatedBounds({ x: box.x + inset + active * cellWidth, width: cellWidth, ...cell }, 0, 0),
      x: box.x + inset + active * cellWidth,
      y: cell.y,
      width: cellWidth,
      height: cell.height,
      rx: Math.max(0, radius - inset),
      style: fade(component, {
        fill: solid(textProperty(component, 'accent')),
        stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: 0.18, blur: 3, dx: 0, dy: 1 },
      }),
    },
  ];
  options.forEach((option, position) => {
    const area = { x: box.x + inset + position * cellWidth, width: cellWidth, ...cell };
    const color = ink(component, textProperty(component, position === active ? 'activeTextColor' : 'textColor'));
    nodes.push(
      labelText(component, `option-${position}`, area, { text: option, color, fontSize: numberProperty(component, 'fontSize'), align: 'center' }, box.order + 0.3),
    );
  });
  return nodes;
}
