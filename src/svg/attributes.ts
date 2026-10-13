import type { RenderNode, SceneShaderSurface, SceneStyle, SceneText } from '../renderScene/scene';
import type { SvgDefinitionRegistry } from './definitions';
import { num, xml } from './format';

function strokeColorAt(style: SceneStyle, edge: 'start' | 'end'): string {
  const paint = style.stroke;
  if (paint?.kind === 'solid') {
    return paint.color;
  }
  if (paint?.kind === 'linear-gradient' && paint.stops.length) {
    const pick =
      edge === 'start'
        ? paint.stops.reduce((a, b) => (a.offset <= b.offset ? a : b))
        : paint.stops.reduce((a, b) => (a.offset >= b.offset ? a : b));
    return pick.color;
  }
  if (paint?.kind === 'mesh-gradient' && paint.points.length) {
    return paint.points[0].color;
  }
  return '#64748b';
}

type StyledRenderNode = Exclude<
  RenderNode,
  SceneText | SceneShaderSurface | Extract<RenderNode, { type: 'rolling-number' | 'image' }>
>;

export function styleAttrs(node: StyledRenderNode, defs: SvgDefinitionRegistry): string {
  const stroke = defs.paint(node.style.stroke, `${node.id}-stroke`, node.bounds);
  const fill = defs.paint(node.style.fill, `${node.id}-fill`, node.bounds);
  const attrs = [`fill="${xml(fill)}"`, `stroke="${xml(stroke)}"`];
  addStrokeAttrs(attrs, node.style);
  addVisualEffectAttrs(attrs, node, defs);
  addPathMarkerAttrs(attrs, node, defs);
  return attrs.join(' ');
}

function addStrokeAttrs(attrs: string[], style: SceneStyle): void {
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
  if (style.pointerEvents) {
    attrs.push(`pointer-events="${style.pointerEvents}"`);
  }
}

function addVisualEffectAttrs(attrs: string[], node: { id: string; style: SceneStyle }, defs: SvgDefinitionRegistry): void {
  const filter = defs.filter(node.style, node.id);
  if (filter) {
    attrs.push(`filter="url(#${filter})"`);
  }
  const clip = defs.clip(node.style);
  if (clip) {
    attrs.push(`clip-path="url(#${clip})"`);
  }
}

function addPathMarkerAttrs(attrs: string[], node: StyledRenderNode, defs: SvgDefinitionRegistry): void {
  if (node.type !== 'path') {
    return;
  }
  const start = defs.marker(node.markerStart, strokeColorAt(node.style, 'start'), node.style.strokeWidth ?? 1);
  const end = defs.marker(node.markerEnd, strokeColorAt(node.style, 'end'), node.style.strokeWidth ?? 1);
  if (start) {
    attrs.push(`marker-start="url(#${start})"`);
  }
  if (end) {
    attrs.push(`marker-end="url(#${end})"`);
  }
}

export function transform(rotation?: number, center?: { x: number; y: number }): string {
  return rotation && center ? ` transform="rotate(${num(rotation)} ${num(center.x)} ${num(center.y)})"` : '';
}

export function imageAttrs(node: Extract<RenderNode, { type: 'image' }>, defs: SvgDefinitionRegistry): string {
  const attrs: string[] = [];
  if (node.style.opacity !== undefined) {
    attrs.push(`opacity="${num(node.style.opacity)}"`);
  }
  if (node.style.pointerEvents) {
    attrs.push(`pointer-events="${node.style.pointerEvents}"`);
  }
  addVisualEffectAttrs(attrs, node, defs);
  return attrs.join(' ');
}
