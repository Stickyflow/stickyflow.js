import type { MarkerType } from '../model/links';
import type { RenderNode, RenderScene, ScenePaint, SceneStyle, SceneText } from './renderScene';
import { DOM_CONTRACT_VERSION } from './renderScene';

export interface SvgRenderOptions { padding?: number; includeXmlDeclaration?: boolean }
export interface SvgRenderResult { svg: string; width: number; height: number; diagnostics: RenderScene['diagnostics'] }

const xml = (value: unknown): string => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const num = (value: number): string => Number(value.toFixed(3)).toString();
const safeId = (value: string): string => `sf-${value.replace(/[^A-Za-z0-9_.:-]/g, '-')}`;

// Interactive DOM contract (§9, ADR-03): every node carries its owner's role/id/
// kind so a viewer can resolve clicks via closest('[data-sf-id]'); the primary
// node of an owner is focusable and labelled.
function contractAttrs(node: RenderNode): string {
  const parts: string[] = [];
  if (node.sfRole) parts.push(`data-sf-role="${node.sfRole}"`);
  if (node.sfId) parts.push(`data-sf-id="${xml(node.sfId)}"`);
  if (node.sfKind) parts.push(`data-sf-kind="${xml(node.sfKind)}"`);
  // aria-label is a single readable line: collapse newlines/whitespace from
  // multi-line entity text so no raw control chars land in the attribute.
  if (node.ariaLabel) parts.push(`tabindex="0" aria-label="${xml(node.ariaLabel.replace(/\s+/g, ' ').trim())}"`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

class Defs {
  entries: string[] = [];
  private paints = new Map<string, string>();
  private filters = new Map<string, string>();
  private markers = new Map<string, string>();

  paint(value: ScenePaint | undefined, nodeId: string, bounds: RenderNode['bounds']): string {
    if (!value || value.kind === 'none') return 'none';
    if (value.kind === 'solid') return value.color;
    const key = JSON.stringify(value) + JSON.stringify(bounds);
    let id = this.paints.get(key);
    if (!id) {
      id = safeId(`gradient-${nodeId}-${this.paints.size}`);
      this.paints.set(key, id);
      if (value.kind === 'mesh-gradient') {
        // SVG 2's native <meshgradient> still has uneven viewer support.
        // Reproduce the Canvas renderer as portable vector SVG instead: a
        // base color plus one transparent radial color layer per mesh point,
        // all expressed in the painted shape's object bounding box.
        const radialIds = value.points.map((point, index) => safeId(`${id}-point-${index}`));
        const radialDefs = value.points.map((point, index) => {
          const cx = Math.max(0, Math.min(100, point.x));
          const cy = Math.max(0, Math.min(100, point.y));
          return `<radialGradient id="${radialIds[index]}" gradientUnits="objectBoundingBox" cx="${num(cx)}%" cy="${num(cy)}%" r="75%"><stop offset="0%" stop-color="${xml(point.color)}" stop-opacity="1"/><stop offset="100%" stop-color="${xml(point.color)}" stop-opacity="0"/></radialGradient>`;
        }).join('');
        const layers = value.points.map((_, index) => `<rect width="1" height="1" fill="url(#${radialIds[index]})"/>`).join('');
        this.entries.push(`${radialDefs}<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><rect width="1" height="1" fill="${xml(value.points[0]?.color ?? 'transparent')}"/>${layers}</pattern>`);
        return `url(#${id})`;
      }
      const angle = value.angle * Math.PI / 180, cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
      const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
      const dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius;
      this.entries.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(cx - dx)}" y1="${num(cy - dy)}" x2="${num(cx + dx)}" y2="${num(cy + dy)}">${value.stops.map(s => `<stop offset="${num(Math.max(0, Math.min(100, s.offset)))}%" stop-color="${xml(s.color)}"/>`).join('')}</linearGradient>`);
    }
    return `url(#${id})`;
  }

  filter(style: SceneStyle, nodeId: string): string | undefined {
    if (!style.shadow) return undefined;
    const key = JSON.stringify(style.shadow);
    let id = this.filters.get(key);
    if (!id) {
      id = safeId(`shadow-${nodeId}-${this.filters.size}`); this.filters.set(key, id);
      const s = style.shadow;
      this.entries.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${num(s.dx)}" dy="${num(s.dy)}" stdDeviation="${num(s.blur / 2)}" flood-color="${xml(s.color)}" flood-opacity="${num(s.opacity)}"/></filter>`);
    }
    return id;
  }

  marker(type: MarkerType | undefined, color: string, strokeWidth: number): string | undefined {
    if (!type || type === 'none') return undefined;
    const key = `${type}:${color}:${strokeWidth}`;
    let id = this.markers.get(key);
    if (id) return id;
    id = safeId(`marker-${type}-${this.markers.size}`); this.markers.set(key, id);
    const size = 12 + (strokeWidth - 2) * 3;
    const compoundErMarker = type === 'one_many' || type === 'zero_many';
    const extent = Math.max(size * (compoundErMarker ? 2 : 1.4), strokeWidth * 2);
    const common = `id="${id}" markerWidth="${num(extent * 2)}" markerHeight="${num(extent * 2)}" viewBox="${num(-extent)} ${num(-extent)} ${num(extent * 2)} ${num(extent * 2)}" refX="0" refY="0" orient="auto-start-reverse" markerUnits="userSpaceOnUse" overflow="visible"`;
    const c = xml(color);
    const body: Record<Exclude<MarkerType, 'none'>, string> = {
      arrow: `<path d="M ${num(-size)} ${num(-size * .6)} L 0 0 L ${num(-size)} ${num(size * .6)}" fill="none" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`,
      filled_arrow: `<path d="M ${num(-size)} ${num(-size * .6)} L 0 0 L ${num(-size)} ${num(size * .6)} Z" fill="${c}" stroke="${c}" stroke-width="${num(strokeWidth * .5)}" stroke-linejoin="round"/>`,
      circle: `<circle cx="0" cy="0" r="${num(size * .5)}" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      filled_circle: `<circle cx="0" cy="0" r="${num(size * .5)}" fill="${c}"/>`,
      diamond: `<path d="M ${num(-size * .6)} 0 L 0 ${num(-size * .6)} L ${num(size * .6)} 0 L 0 ${num(size * .6)} Z" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      filled_diamond: `<path d="M ${num(-size * .6)} 0 L 0 ${num(-size * .6)} L ${num(size * .6)} 0 L 0 ${num(size * .6)} Z" fill="${c}" stroke="${c}" stroke-width="${num(strokeWidth * .5)}"/>`,
      bar: `<path d="M 0 ${num(-size * .6)} V ${num(size * .6)}" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
      triangle: `<path d="M ${num(-size)} ${num(-size * .72)} L 0 0 L ${num(-size)} ${num(size * .72)} Z" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linejoin="round"/>`,
      one: `<path d="M 0 ${num(-size * .62)} V ${num(size * .62)} M ${num(-size * .72)} ${num(-size * .62)} V ${num(size * .62)}" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      zero_one: `<circle cx="${num(-size * .8)}" cy="0" r="${num(size * .38)}" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/><path d="M 0 ${num(-size * .62)} V ${num(size * .62)}" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      many: `<path d="M ${num(-size)} ${num(-size * .72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * .72)} L 0 0" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
      one_many: `<path d="M ${num(-size)} ${num(-size * .72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * .72)} L 0 0 M ${num(-size * 1.45)} ${num(-size * .62)} V ${num(size * .62)}" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
      zero_many: `<circle cx="${num(-size * 1.45)}" cy="0" r="${num(size * .38)}" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/><path d="M ${num(-size)} ${num(-size * .72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * .72)} L 0 0" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
    };
    this.entries.push(`<marker ${common}>${body[type]}</marker>`);
    return id;
  }
}

function styleAttrs(node: Exclude<RenderNode, SceneText>, defs: Defs): string {
  const style = node.style, stroke = defs.paint(style.stroke, `${node.id}-stroke`, node.bounds), fill = defs.paint(style.fill, `${node.id}-fill`, node.bounds);
  const attrs = [`fill="${xml(fill)}"`, `stroke="${xml(stroke)}"`];
  if (style.strokeWidth !== undefined) attrs.push(`stroke-width="${num(style.strokeWidth)}"`);
  if (style.dash?.length) attrs.push(`stroke-dasharray="${style.dash.map(num).join(' ')}"`);
  if (style.lineCap) attrs.push(`stroke-linecap="${style.lineCap}"`);
  if (style.lineJoin) attrs.push(`stroke-linejoin="${style.lineJoin}"`);
  if (style.opacity !== undefined) attrs.push(`opacity="${num(style.opacity)}"`);
  const filter = defs.filter(style, node.id); if (filter) attrs.push(`filter="url(#${filter})"`);
  if (node.type === 'path') {
    const solidStroke = style.stroke?.kind === 'solid' ? style.stroke.color : '#64748b';
    const start = defs.marker(node.markerStart, solidStroke, style.strokeWidth ?? 1);
    const end = defs.marker(node.markerEnd, solidStroke, style.strokeWidth ?? 1);
    if (start) attrs.push(`marker-start="url(#${start})"`);
    if (end) attrs.push(`marker-end="url(#${end})"`);
  }
  return attrs.join(' ');
}

function transform(rotation?: number, center?: { x: number; y: number }): string {
  return rotation && center ? ` transform="rotate(${num(rotation)} ${num(center.x)} ${num(center.y)})"` : '';
}

function textSvg(node: SceneText): string {
  const linePx = node.fontSize * node.lineHeight, contentHeight = node.lines.length * linePx;
  const firstY = node.verticalAlign === 'top' ? node.y + node.fontSize
    : node.verticalAlign === 'bottom' ? node.y + node.height - contentHeight + node.fontSize
      : node.y + (node.height - contentHeight) / 2 + node.fontSize;
  const x = node.align === 'left' ? node.x : node.align === 'right' ? node.x + node.width : node.x + node.width / 2;
  const anchor = node.align === 'left' ? 'start' : node.align === 'right' ? 'end' : 'middle';
  // Office's SVG-to-shape converter may interpret unitless font sizes as points
  // while treating the remaining SVG user units as CSS pixels. Explicit px units
  // keep text and geometry on the same scale after "Convert to Shape".
  const fontSize = `${num(node.fontSize)}px`;
  return `<text id="${safeId(node.id)}"${contractAttrs(node)} x="${num(x)}" y="${num(firstY)}" font-family="${xml(node.fontFamily)}" font-size="${fontSize}" font-weight="${node.fontWeight}" fill="${xml(node.color)}" text-anchor="${anchor}"${transform(node.rotation, node.rotationCenter)}>${node.lines.map((line, i) => `<tspan x="${num(x)}" font-size="${fontSize}"${i ? ` dy="${num(linePx)}px"` : ''}>${xml(line)}</tspan>`).join('')}</text>`;
}

function nodeSvg(node: RenderNode, defs: Defs): string {
  if (node.type === 'text') return textSvg(node);
  const attrs = `id="${safeId(node.id)}"${contractAttrs(node)} ${styleAttrs(node, defs)}`;
  if (node.type === 'rect') return `<rect ${attrs} x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}"${node.rx ? ` rx="${num(node.rx)}"` : ''}${transform(node.rotation, { x: node.x + node.width / 2, y: node.y + node.height / 2 })}/>`;
  if (node.type === 'ellipse') return `<ellipse ${attrs} cx="${num(node.cx)}" cy="${num(node.cy)}" rx="${num(node.rx)}" ry="${num(node.ry)}"${transform(node.rotation, { x: node.cx, y: node.cy })}/>`;
  return `<path ${attrs} d="${xml(node.d)}"${transform(node.rotation, node.rotationCenter)}/>`;
}

export function renderSceneToSvg(scene: RenderScene, options: SvgRenderOptions = {}): SvgRenderResult {
  const padding = options.padding ?? 16;
  const width = Math.max(1, scene.bounds.maxX - scene.bounds.minX + padding * 2);
  const height = Math.max(1, scene.bounds.maxY - scene.bounds.minY + padding * 2);
  const viewBox = `${num(scene.bounds.minX - padding)} ${num(scene.bounds.minY - padding)} ${num(width)} ${num(height)}`;
  const defs = new Defs();
  const body = scene.nodes.map(node => nodeSvg(node, defs)).join('\n  ');
  const declaration = options.includeXmlDeclaration === false ? '' : '<?xml version="1.0" encoding="UTF-8"?>\n';
  const svg = `${declaration}<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}px" height="${num(height)}px" viewBox="${viewBox}" role="img" data-sf-contract="${DOM_CONTRACT_VERSION}">\n  <defs>${defs.entries.join('')}</defs>\n  ${body}\n</svg>`;
  return { svg, width, height, diagnostics: scene.diagnostics };
}
