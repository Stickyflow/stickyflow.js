import {
  type Component,
  formatRollingNumber,
  type RollingNumberComponent,
  type RulerComponent,
  resolveRollingNumberStyle,
  type TickScaleComponent,
} from '../../model/component';
import { DEFAULT_FONT, finite, type RenderNode, rotatedBounds } from '../scene';
import { tag } from '../scene/tagging';

function buildRollingNumber(component: RollingNumberComponent, index: number): RenderNode[] {
  const x = finite(component.x, 0);
  const y = finite(component.y, 0);
  const width = Math.max(0, finite(component.width, 160));
  const height = Math.max(0, finite(component.height, 90));
  const rotation = finite(component.rotation, 0);
  return [
    {
      id: `widget-${component.id}`,
      type: 'rolling-number',
      order: 10_000 + index,
      bounds: rotatedBounds({ x, y, width, height }, rotation, 2),
      x,
      y,
      width,
      height,
      rotation,
      value: formatRollingNumber(component.value, component.digits),
      digits: component.digits,
      duration: Math.max(0, finite(component.duration, 420)),
      label: component.label,
      componentStyle: resolveRollingNumberStyle(component.style),
    },
  ];
}

function buildTickScale(component: TickScaleComponent, index: number): RenderNode[] {
  const x = finite(component.x, 0);
  const y = finite(component.y, 0);
  const width = Math.max(0, finite(component.width, 200));
  const height = Math.max(0, finite(component.height, 200));
  const rotation = finite(component.rotation, 0);
  const max = finite(component.max, 100) || 100;
  const progress = Math.min(1, Math.max(0, finite(Number(component.value), 0) / max));
  const nodes: RenderNode[] = [
    {
      id: `widget-${component.id}`,
      type: 'shader-surface',
      order: 10_000 + index,
      bounds: rotatedBounds({ x, y, width, height }, rotation, 2),
      x,
      y,
      width,
      height,
      rotation,
      shader: { name: component.id, program: 'tickScale', parameters: { ...component.parameters, progress, max } },
      mask: 'ellipse',
    },
  ];
  if (component.labels) {
    nodes.push(...buildTickLabels(component, { x, y, width, height, rotation, max, order: 10_000 + index }));
  }
  return nodes;
}

function buildTickLabels(
  component: TickScaleComponent,
  box: { x: number; y: number; width: number; height: number; rotation: number; max: number; order: number },
): RenderNode[] {
  const labels = component.labels ?? {};
  const ticks = Math.max(1, finite(Number(component.parameters.ticks), 48));
  const major = Math.max(1, finite(Number(component.parameters.major), 5));
  const start = (finite(Number(component.parameters.start), 225) * Math.PI) / 180;
  const sweep = (finite(Number(component.parameters.sweep), 270) * Math.PI) / 180;
  const radius = finite(Number(component.parameters.radius), 0.9) + finite(labels.offset, 0.08);
  const fontSize = finite(labels.size, 12);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const count = Math.floor(ticks / major);
  const nodes: RenderNode[] = [];
  for (let step = 0; step <= count; step += 1) {
    const fraction = (step * major) / ticks;
    const angle = start - fraction * sweep;
    const labelX = centerX + Math.cos(angle) * radius * (box.width / 2);
    const labelY = centerY - Math.sin(angle) * radius * (box.height / 2);
    const labelBox = { x: labelX - 24, y: labelY - fontSize, width: 48, height: fontSize * 2 };
    nodes.push({
      id: `widget-${component.id}-label-${step}`,
      type: 'text',
      order: box.order + 0.1,
      bounds: rotatedBounds(labelBox, 0, 2),
      ...labelBox,
      lines: [String(Math.round(box.max * fraction * 10) / 10)],
      fontFamily: labels.fontFamily || DEFAULT_FONT,
      fontSize,
      fontWeight: (labels.weight ?? 'normal') as 'normal',
      color: labels.color || '#8f95c4',
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.3,
    });
  }
  return nodes;
}

function buildRuler(component: RulerComponent, index: number): RenderNode[] {
  const x = finite(component.x, 0);
  const y = finite(component.y, 0);
  const width = Math.max(0, finite(component.width, 120));
  const height = Math.max(0, finite(component.height, 360));
  const rotation = finite(component.rotation, 0);
  const min = finite(component.min, 0);
  const max = finite(component.max, 100);
  const progress =
    max === min ? 0 : Math.min(1, Math.max(0, (finite(Number(component.value), min) - min) / (max - min)));
  const nodes: RenderNode[] = [
    {
      id: `widget-${component.id}`,
      type: 'shader-surface',
      order: 10_000 + index,
      bounds: rotatedBounds({ x, y, width, height }, rotation, 2),
      x,
      y,
      width,
      height,
      rotation,
      shader: { name: component.id, program: 'ruler', parameters: { ...component.parameters, progress, min, max } },
      mask: 'rect',
    },
  ];
  if (component.labels) {
    nodes.push(...buildRulerLabels(component, { x, y, width, height, min, max, order: 10_000 + index }));
  }
  return nodes;
}

function buildRulerLabels(
  component: RulerComponent,
  box: { x: number; y: number; width: number; height: number; min: number; max: number; order: number },
): RenderNode[] {
  const labels = component.labels ?? {};
  const horizontal = component.parameters.axis === 'horizontal';
  const ticks = Math.max(1, finite(Number(component.parameters.ticks), 50));
  const major = Math.max(1, finite(Number(component.parameters.major), 5));
  const inset =
    finite(Number(component.parameters.inset), 0.05) > 0 ? finite(Number(component.parameters.inset), 0.05) : 0.05;
  const line =
    finite(Number(component.parameters.line), 0.7) > 0 ? finite(Number(component.parameters.line), 0.7) : 0.7;
  const across = horizontal ? box.height : box.width;
  const tickLength =
    (finite(Number(component.parameters.length), 0.1) > 0 ? finite(Number(component.parameters.length), 0.1) : 0.1) *
    across *
    1.9;
  const edge = line * across - 0.12 * across - tickLength - finite(labels.offset, 0.04) * across;
  const fontSize = finite(labels.size, 12);
  const count = Math.floor(ticks / major);
  const nodes: RenderNode[] = [];
  for (let step = 0; step <= count; step += 1) {
    const fraction = (step * major) / ticks;
    const along = inset + (1 - 2 * inset) * fraction;
    const labelBox = horizontal
      ? { x: box.x + box.width * along - 24, y: box.y + edge - fontSize * 2, width: 48, height: fontSize * 2 }
      : { x: box.x + edge - 48, y: box.y + box.height * (1 - along) - fontSize, width: 48, height: fontSize * 2 };
    nodes.push({
      id: `widget-${component.id}-label-${step}`,
      type: 'text',
      order: box.order + 0.1,
      bounds: rotatedBounds(labelBox, 0, 2),
      ...labelBox,
      lines: [String(Math.round((box.min + (box.max - box.min) * fraction) * 10) / 10)],
      fontFamily: labels.fontFamily || DEFAULT_FONT,
      fontSize,
      fontWeight: (labels.weight ?? 'normal') as 'normal',
      color: labels.color || '#8f95c4',
      align: horizontal ? 'center' : 'right',
      verticalAlign: 'middle',
      lineHeight: 1.3,
    });
  }
  return nodes;
}

export function buildComponents(components: readonly Component[]): RenderNode[] {
  return components.flatMap((component, index) =>
    tag(
      component.type === 'tickScale'
        ? buildTickScale(component, index)
        : component.type === 'ruler'
          ? buildRuler(component, index)
          : buildRollingNumber(component, index),
      'widget',
      component.id,
      component.type,
      component.label ?? component.value,
      component.parentFrameId,
    ),
  );
}
