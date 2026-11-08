import type { ViewBox } from './types';

// The HTML parser reads SVG as foreign content, about three times as fast as the XML parser, which counts while a drawing is made again
// with every move of a control.
export function parseSvg(svgString: string): SVGSVGElement {
  const template = globalThis.document.createElement('template');
  template.innerHTML = svgString;
  const root = template.content.querySelector('svg');
  if (!root || root.parentNode !== template.content) {
    throw new Error('viewer: source did not parse to an <svg> root');
  }
  return root;
}

export function readViewBox(svg: SVGSVGElement): ViewBox {
  const values = (svg.getAttribute('viewBox') ?? '0 0 100 100').split(/\s+/).map(Number);
  return { x: values[0], y: values[1], w: values[2], h: values[3] };
}
