import type { ViewBox } from './types';

export function parseSvg(svgString: string): SVGSVGElement {
  const document = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = document.documentElement as unknown as SVGSVGElement;
  if (root.nodeName.toLowerCase() !== 'svg') {
    throw new Error('viewer: source did not parse to an <svg> root');
  }
  return root;
}

export function readViewBox(svg: SVGSVGElement): ViewBox {
  const values = (svg.getAttribute('viewBox') ?? '0 0 100 100').split(/\s+/).map(Number);
  return { x: values[0], y: values[1], w: values[2], h: values[3] };
}
