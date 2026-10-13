import { formatRollingNumber, resolveRollingNumberStyle, type Widget } from '../../model/widget';
import { finite, type RenderNode, rotatedBounds } from '../scene';
import { tag } from '../scene/tagging';

function buildRollingNumber(widget: Widget, index: number): RenderNode[] {
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

export function buildWidgets(widgets: readonly Widget[]): RenderNode[] {
  return widgets.flatMap((widget, index) =>
    tag(
      buildRollingNumber(widget, index),
      'widget',
      widget.id,
      widget.type,
      widget.label ?? widget.value,
      widget.parentFrameId,
    ),
  );
}
