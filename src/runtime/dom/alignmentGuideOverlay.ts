import { SVG_NAMESPACE } from './svgNamespace';

const NS = SVG_NAMESPACE;
const DASH = '8 4';

export type GuideLine =
  | { orientation: 'vertical' | 'horizontal'; position: number; from: number; to: number }
  | { orientation: 'segment'; x1: number; y1: number; x2: number; y2: number };

function el<K extends keyof SVGElementTagNameMap>(doc: Document, tag: K): SVGElementTagNameMap[K] {
  return doc.createElementNS(NS, tag) as SVGElementTagNameMap[K];
}

export function updateAlignmentGuides(svg: SVGSVGElement, guides: GuideLine[], color: string): void {
  svg.querySelectorAll('[data-sf-alignment-guides]').forEach(g => {
    g.remove();
  });
  if (!guides.length) {
    return;
  }
  const doc = svg.ownerDocument;
  const g = el(doc, 'g');
  g.setAttribute('data-sf-alignment-guides', '');
  g.setAttribute('pointer-events', 'none');
  guides.forEach(guide => {
    const line = el(doc, 'line');
    if (guide.orientation === 'segment') {
      line.setAttribute('x1', String(guide.x1));
      line.setAttribute('y1', String(guide.y1));
      line.setAttribute('x2', String(guide.x2));
      line.setAttribute('y2', String(guide.y2));
    } else if (guide.orientation === 'vertical') {
      line.setAttribute('x1', String(guide.position));
      line.setAttribute('x2', String(guide.position));
      line.setAttribute('y1', String(guide.from));
      line.setAttribute('y2', String(guide.to));
    } else {
      line.setAttribute('y1', String(guide.position));
      line.setAttribute('y2', String(guide.position));
      line.setAttribute('x1', String(guide.from));
      line.setAttribute('x2', String(guide.to));
    }
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', DASH);
    line.setAttribute('opacity', '0.8');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    g.appendChild(line);
  });
  svg.appendChild(g);
}

export function clearAlignmentGuides(svg: SVGSVGElement): void {
  svg.querySelectorAll('[data-sf-alignment-guides]').forEach(g => {
    g.remove();
  });
}
