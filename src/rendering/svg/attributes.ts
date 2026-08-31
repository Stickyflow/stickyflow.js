import type { RenderNode, SceneImage, SceneStyle, SceneText } from '../renderScene'
import { SvgDefinitionRegistry } from './definitions'
import { num, xml } from './format'

function strokeColorAt(style: SceneStyle, edge: 'start' | 'end'): string {
  const paint = style.stroke;
  if (paint?.kind === 'solid') {
    return paint.color;
  }
  if (paint?.kind === 'linear-gradient' && paint.stops.length) {
    const pick = edge === 'start'
      ? paint.stops.reduce((a, b) => (a.offset <= b.offset ? a : b))
      : paint.stops.reduce((a, b) => (a.offset >= b.offset ? a : b));
    return pick.color;
  }
  if (paint?.kind === 'mesh-gradient' && paint.points.length) {
    return paint.points[0].color;
  }
  return '#64748b';
}

export function styleAttrs(node: Exclude<RenderNode, SceneText | SceneImage>, defs: SvgDefinitionRegistry): string {
  const style = node.style, stroke = defs.paint(style.stroke, `${node.id}-stroke`, node.bounds), fill = defs.paint(style.fill, `${node.id}-fill`, node.bounds);
  const attrs = [`fill="${xml(fill)}"`, `stroke="${xml(stroke)}"`];
  if (style.strokeWidth !== undefined) {
    attrs.push(`stroke-width="${num(style.strokeWidth)}"`);
  }
  if (style.dash?.length) {
    attrs.push(`stroke-dasharray="${style.dash.map(num).join(' ')}"`);
  }
  if (style.lineCap) {
    attrs.push(`stroke-linecap="${style.lineCap}"`);
  }
  if (style.lineJoin) {
    attrs.push(`stroke-linejoin="${style.lineJoin}"`);
  }
  if (style.opacity !== undefined) {
    attrs.push(`opacity="${num(style.opacity)}"`);
  }
  const filter = defs.filter(style, node.id);
  if (filter) {
    attrs.push(`filter="url(#${filter})"`);
  }
  if (node.type === 'path') {
    const start = defs.marker(node.markerStart, strokeColorAt(style, 'start'), style.strokeWidth ?? 1);
    const end = defs.marker(node.markerEnd, strokeColorAt(style, 'end'), style.strokeWidth ?? 1);
    if (start) {
      attrs.push(`marker-start="url(#${start})"`);
    }
    if (end) {
      attrs.push(`marker-end="url(#${end})"`);
    }
  }
  return attrs.join(' ');
}

export function transform(rotation?: number, center?: { x: number; y: number }): string {
  return rotation && center ? ` transform="rotate(${num(rotation)} ${num(center.x)} ${num(center.y)})"` : '';
}
