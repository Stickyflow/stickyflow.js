import type { GenericComponent } from '../../../model/component';
import { DEFAULT_FONT, finite, type RenderNode, rotatedBounds, type SceneStyle } from '../../scene';

const DISABLED_INK = '#94a3b8';

export interface ControlBox {
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export function controlBox(
  component: GenericComponent,
  index: number,
  fallback: { width: number; height: number },
): ControlBox {
  return {
    x: finite(component.x, 0),
    y: finite(component.y, 0),
    width: Math.max(1, finite(component.width, fallback.width)),
    height: Math.max(1, finite(component.height, fallback.height)),
    order: 10_000 + index,
  };
}

export const textProperty = (component: GenericComponent, key: string): string =>
  String(component.properties[key] ?? '');

export const numberProperty = (component: GenericComponent, key: string): number =>
  Number(component.properties[key] ?? 0);

export const solid = (color: string) => ({ kind: 'solid', color }) as const;

export const ink = (component: GenericComponent, color: string): string => (component.disabled ? DISABLED_INK : color);

export function fade(component: GenericComponent, style: SceneStyle): SceneStyle {
  const animate = Number(component.properties.animate ?? 0);
  const shown = component.disabled ? { ...style, opacity: 0.4 } : style;
  return animate > 0 ? { ...shown, transition: animate } : shown;
}

export function hitArea(component: GenericComponent, box: ControlBox): RenderNode {
  return {
    id: `widget-${component.id}`,
    type: 'rect',
    order: box.order,
    bounds: rotatedBounds(box, 0, 0),
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    style: { fill: { kind: 'none' }, stroke: { kind: 'none' }, pointerEvents: 'all' },
  };
}

export function labelText(
  component: GenericComponent,
  part: string,
  area: { x: number; y: number; width: number; height: number },
  label: { text: string; color: string; fontSize: number; align: 'left' | 'center' | 'right' },
  order: number,
): RenderNode {
  return {
    id: `widget-${component.id}-${part}`,
    type: 'text',
    order,
    bounds: rotatedBounds(area, 0, 0),
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    lines: [label.text],
    fontFamily: DEFAULT_FONT,
    fontSize: label.fontSize,
    fontWeight: '600',
    color: label.color,
    align: label.align,
    verticalAlign: 'middle',
    lineHeight: 1.3,
  };
}
