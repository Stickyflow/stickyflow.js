import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty } from './controlParts';

export function buildButton(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 120, height: 40 });
  const nodes: RenderNode[] = [
    hitArea(component, box),
    {
      id: `widget-${component.id}-face`,
      type: 'rect',
      order: box.order + 0.1,
      bounds: rotatedBounds(box, 0, 0),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rx: Math.min(numberProperty(component, 'radius'), box.height / 2),
      style: fade(component, { fill: solid(textProperty(component, 'accent')), stroke: { kind: 'none' } }),
    },
  ];
  if (component.label) {
    const label = {
      text: component.label,
      color: ink(component, textProperty(component, 'textColor')),
      fontSize: numberProperty(component, 'fontSize'),
      align: 'center',
    } as const;
    nodes.push(labelText(component, 'label', box, label, box.order + 0.2));
  }
  return nodes;
}
