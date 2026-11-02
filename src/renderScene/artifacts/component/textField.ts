import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import { controlBox, fade, hitArea, ink, labelText, numberProperty, solid, textProperty } from './controlParts';

const LINE_WIDTH = 1.5;
const AVERAGE_LETTER = 0.56;

function shownValue(component: GenericComponent, room: number): string {
  const value = String(component.value ?? '');
  const text = component.properties.format === 'password' ? '•'.repeat([...value].length) : value;
  const fits = Math.max(1, Math.floor(room / (numberProperty(component, 'fontSize') * AVERAGE_LETTER)));
  const letters = [...text];
  return letters.length > fits ? `…${letters.slice(1 - fits).join('')}` : text;
}

// The field as it is drawn. While it has the focus the browser shows the text and the caret in a real input that lies on it.
export function buildTextField(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 240, height: 44 });
  const focused = component.properties.focused === true;
  const stroke = textProperty(component, focused ? 'accent' : 'stroke');
  const line = component.properties.variant === 'line';
  const fill = textProperty(component, 'fill');
  const face = line ? { ...box, y: box.y + box.height - LINE_WIDTH, height: LINE_WIDTH } : box;
  const nodes: RenderNode[] = [
    hitArea(component, box),
    {
      id: `widget-${component.id}-face`,
      type: 'rect',
      order: box.order + 0.1,
      bounds: rotatedBounds(face, 0, 0),
      x: face.x,
      y: face.y,
      width: face.width,
      height: face.height,
      rx: line ? 0 : Math.min(numberProperty(component, 'radius'), box.height / 2),
      style: fade(
        component,
        line
          ? { fill: solid(stroke), stroke: { kind: 'none' } }
          : {
              fill: fill === 'none' ? { kind: 'none' } : solid(fill),
              stroke: solid(stroke),
              strokeWidth: focused ? 2 : 1,
            },
      ),
    },
  ];
  const padding = numberProperty(component, 'padding');
  const area = { x: box.x + padding, y: box.y, width: Math.max(1, box.width - padding * 2), height: box.height };
  const value = shownValue(component, area.width);
  if (!focused && value) {
    const color = ink(component, textProperty(component, 'textColor'));
    const fontSize = numberProperty(component, 'fontSize');
    const label = { text: value, color, fontSize, align: 'left' } as const;
    nodes.push({ ...labelText(component, 'value', area, label, box.order + 0.2), fontWeight: '400' } as RenderNode);
  } else if (!value && !focused) {
    const color = textProperty(component, 'placeholderColor');
    const fontSize = numberProperty(component, 'fontSize');
    const label = { text: textProperty(component, 'placeholder'), color, fontSize, align: 'left' } as const;
    if (label.text) {
      nodes.push({ ...labelText(component, 'value', area, label, box.order + 0.2), fontWeight: '400' } as RenderNode);
    }
  }
  return nodes;
}
