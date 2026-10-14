import { formatRollingNumber, resolveRollingNumberStyle, type RollingNumberWidget, type TickScaleWidget, type Widget } from '../../model/widget';
import { DEFAULT_FONT, finite, type RenderNode, rotatedBounds } from '../scene';
import { tag } from '../scene/tagging';

function buildRollingNumber(widget: RollingNumberWidget, index: number): RenderNode[] {
  const x = finite(widget.x, 0);
  const y = finite(widget.y, 0);
  const width = Math.max(0, finite(widget.width, 160));
  const height = Math.max(0, finite(widget.height, 90));
  const rotation = finite(widget.rotation, 0);
  return [
    {
      id: `widget-${widget.id}`,
      type: 'rolling-number',
      order: 10_000 + index,
      bounds: rotatedBounds({ x, y, width, height }, rotation, 2),
      x,
      y,
      width,
      height,
      rotation,
      value: formatRollingNumber(widget.value, widget.digits),
      digits: widget.digits,
      duration: Math.max(0, finite(widget.duration, 420)),
      label: widget.label,
      widgetStyle: resolveRollingNumberStyle(widget.style),
    },
  ];
}

// The tick scale is a circle surface running the tickScale program; its progress is value / max.
function buildTickScale(widget: TickScaleWidget, index: number): RenderNode[] {
  const x = finite(widget.x, 0);
  const y = finite(widget.y, 0);
  const width = Math.max(0, finite(widget.width, 200));
  const height = Math.max(0, finite(widget.height, 200));
  const rotation = finite(widget.rotation, 0);
  const max = finite(widget.max, 100) || 100;
  const progress = Math.min(1, Math.max(0, finite(Number(widget.value), 0) / max));
  const nodes: RenderNode[] = [
    {
      id: `widget-${widget.id}`,
      type: 'shader-surface',
      order: 10_000 + index,
      bounds: rotatedBounds({ x, y, width, height }, rotation, 2),
      x,
      y,
      width,
      height,
      rotation,
      shader: { name: widget.id, program: 'tickScale', parameters: { ...widget.parameters, progress, max } },
      mask: 'ellipse',
    },
  ];
  if (widget.labels) {
    nodes.push(...buildTickLabels(widget, { x, y, width, height, rotation, max, order: 10_000 + index }));
  }
  return nodes;
}

// One number per major tick, placed on the same arc as the ticks.
function buildTickLabels(
  widget: TickScaleWidget,
  box: { x: number; y: number; width: number; height: number; rotation: number; max: number; order: number },
): RenderNode[] {
  const labels = widget.labels ?? {};
  const ticks = Math.max(1, finite(Number(widget.parameters.ticks), 48));
  const major = Math.max(1, finite(Number(widget.parameters.major), 5));
  const start = (finite(Number(widget.parameters.start), 225) * Math.PI) / 180;
  const sweep = (finite(Number(widget.parameters.sweep), 270) * Math.PI) / 180;
  const radius = finite(Number(widget.parameters.radius), 0.9) + finite(labels.offset, 0.08);
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
      id: `widget-${widget.id}-label-${step}`,
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

export function buildWidgets(widgets: readonly Widget[]): RenderNode[] {
  return widgets.flatMap((widget, index) =>
    tag(
      widget.type === 'tickScale' ? buildTickScale(widget, index) : buildRollingNumber(widget, index),
      'widget',
      widget.id,
      widget.type,
      widget.label ?? widget.value,
      widget.parentFrameId,
    ),
  );
}
