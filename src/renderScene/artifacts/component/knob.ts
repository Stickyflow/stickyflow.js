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

interface Dial {
  cx: number;
  cy: number;
  radius: number;
  thickness: number;
  fraction: number;
  start: number;
  sweep: number;
  circumference: number;
  rounded: boolean;
}

function dialOf(component: GenericComponent, box: ControlBox): Dial {
  const min = numberProperty(component, 'min');
  const max = numberProperty(component, 'max');
  const thickness = Math.min(numberProperty(component, 'thickness'), Math.min(box.width, box.height) / 3);
  const radius = Math.max(1, Math.min(box.width, box.height) / 2 - thickness / 2);
  return {
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    radius,
    thickness,
    fraction: Math.min(1, Math.max(0, (Number(component.value) - min) / (max - min || 1))),
    start: numberProperty(component, 'start'),
    sweep: Math.min(360, Math.max(1, numberProperty(component, 'sweep'))),
    circumference: 2 * Math.PI * radius,
    rounded: textProperty(component, 'rounded') !== 'false',
  };
}

// One stretch of the ring, as a dash of a circle that starts at `start` and runs clockwise.
function arcNode(
  component: GenericComponent,
  box: ControlBox,
  dial: Dial,
  part: string,
  order: number,
  color: string,
  length: number,
  extra: object = {},
): RenderNode {
  const { cx, cy, radius, thickness } = dial;
  return {
    id: `widget-${component.id}-${part}`,
    type: 'ellipse',
    order: box.order + order,
    bounds: rotatedBounds({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }, 0, thickness),
    cx,
    cy,
    rx: radius,
    ry: radius,
    rotation: -dial.start,
    style: fade(component, {
      fill: { kind: 'none' },
      stroke: solid(color),
      strokeWidth: thickness,
      dash: [Math.max(0.001, length), dial.circumference],
      lineCap: dial.rounded ? 'round' : 'butt',
      ...extra,
    }),
  } as RenderNode;
}

// A filled disc, as the face in the middle and the dot on the ring.
function discNode(
  component: GenericComponent,
  box: ControlBox,
  part: string,
  order: number,
  center: { x: number; y: number },
  radius: number,
  fill: string,
): RenderNode {
  return {
    id: `widget-${component.id}-${part}`,
    type: 'ellipse',
    order: box.order + order,
    bounds: rotatedBounds({ x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 }, 0, 0),
    cx: center.x,
    cy: center.y,
    rx: radius,
    ry: radius,
    style: fade(component, { fill: solid(fill), stroke: { kind: 'none' } }),
  };
}

// A dial: an arc that fills up to the value, a face in the middle with the value on it, and a dot on the arc where the value is.
export function buildKnob(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 96, height: 96 });
  const dial = dialOf(component, box);
  const { cx, cy, radius, thickness, fraction, sweep, circumference } = dial;
  // The angles are counted counterclockwise from the east, as on a plain, and the arc runs clockwise from `start`.
  const angle = ((dial.start - fraction * sweep) * Math.PI) / 180;
  const faceRadius = Math.max(1, radius - thickness / 2 - Math.max(2, thickness * 0.4));
  const dotRadius = (thickness / 2) * DOT_RATIO + 1;
  const nodes: RenderNode[] = [
    hitArea(component, box),
    arcNode(component, box, dial, 'track', 0.1, textProperty(component, 'track'), (sweep / 360) * circumference),
    arcNode(
      component,
      box,
      dial,
      'fill',
      0.2,
      textProperty(component, 'accent'),
      ((fraction * sweep) / 360) * circumference,
      {
        opacity: fraction > 0 ? 1 : 0,
      },
    ),
    discNode(component, box, 'face', 0.3, { x: cx, y: cy }, faceRadius, textProperty(component, 'face')),
    discNode(
      component,
      box,
      'dot',
      0.4,
      { x: cx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) },
      dotRadius,
      textProperty(component, 'dot'),
    ),
  ];
  const text = readout(component, fraction);
  if (text) {
    const label = {
      text,
      color: ink(component, textProperty(component, 'textColor')),
      fontSize: numberProperty(component, 'fontSize'),
      align: 'center',
    } as const;
    nodes.push(
      labelText(
        component,
        'value',
        { x: cx - faceRadius, y: cy - faceRadius, width: faceRadius * 2, height: faceRadius * 2 },
        label,
        box.order + 0.5,
      ),
    );
  }
  return nodes;
}
