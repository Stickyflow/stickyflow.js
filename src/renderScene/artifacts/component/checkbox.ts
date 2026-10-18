import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds } from '../../scene';
import {
  type ControlBox,
  controlBox,
  fade,
  hitArea,
  ink,
  labelText,
  numberProperty,
  solid,
  textProperty,
} from './controlParts';

const CORNER_RATIO = 0.22;
const LABEL_GAP_RATIO = 0.5;
const CHECK_MARK = [
  [0.24, 0.52],
  [0.43, 0.72],
  [0.78, 0.3],
] as const;

interface Square {
  x: number;
  y: number;
  width: number;
  height: number;
}

function checkPath(square: Square): string {
  const [first, ...rest] = CHECK_MARK.map(([u, v]) => `${square.x + u * square.width} ${square.y + v * square.width}`);
  return `M ${first} ${rest.map(point => `L ${point}`).join(' ')}`;
}

function boxNode(component: GenericComponent, box: ControlBox, square: Square): RenderNode {
  const on = component.value === true;
  return {
    id: `widget-${component.id}-box`,
    type: 'rect',
    order: box.order + 0.1,
    bounds: rotatedBounds(square, 0, 2),
    ...square,
    rx: square.width * CORNER_RATIO,
    style: fade(component, {
      fill: on ? solid(textProperty(component, 'accent')) : { kind: 'none' },
      stroke: solid(on ? textProperty(component, 'accent') : textProperty(component, 'stroke')),
      strokeWidth: 1.5,
    }),
  };
}

function checkNode(component: GenericComponent, box: ControlBox, square: Square): RenderNode {
  return {
    id: `widget-${component.id}-check`,
    type: 'path',
    order: box.order + 0.2,
    bounds: rotatedBounds(square, 0, 0),
    d: checkPath(square),
    style: fade(component, {
      fill: { kind: 'none' },
      stroke: solid(textProperty(component, 'check')),
      strokeWidth: Math.max(1.5, square.width * 0.12),
      lineCap: 'round',
      lineJoin: 'round',
    }),
  };
}

function labelNode(component: GenericComponent, box: ControlBox, side: number, text: string): RenderNode {
  const gap = side * LABEL_GAP_RATIO;
  const area = { x: box.x + side + gap, y: box.y, width: Math.max(0, box.width - side - gap), height: box.height };
  const label = {
    text,
    color: ink(component, textProperty(component, 'textColor')),
    fontSize: numberProperty(component, 'fontSize'),
    align: 'left',
  } as const;
  return labelText(component, 'label', area, label, box.order + 0.3);
}

export function buildCheckbox(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 160, height: 24 });
  const side = Math.min(box.height, box.width);
  const square = { x: box.x, y: box.y + (box.height - side) / 2, width: side, height: side };
  return [
    hitArea(component, box),
    boxNode(component, box, square),
    ...(component.value === true ? [checkNode(component, box, square)] : []),
    ...(component.label ? [labelNode(component, box, side, component.label)] : []),
  ];
}
