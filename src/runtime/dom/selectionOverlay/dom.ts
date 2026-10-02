import { SVG_NAMESPACE } from '../svgNamespace';

export function svgElement<K extends keyof SVGElementTagNameMap>(document: Document, tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, tag) as SVGElementTagNameMap[K];
}

export function selectionOverlayGroup(document: Document, id: string, primary: SVGGraphicsElement): SVGGElement {
  const group = svgElement(document, 'g');
  group.setAttribute('data-sf-selection-overlay', id);
  group.setAttribute('pointer-events', 'none');
  const transform = primary.getAttribute('transform');
  if (transform) {
    group.setAttribute('transform', transform);
  }
  return group;
}
