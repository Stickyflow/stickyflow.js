import { pxPerUnit } from '../domQuery';

export function screenPx(svg: SVGSVGElement, px: number): number {
  return px / pxPerUnit(svg);
}
