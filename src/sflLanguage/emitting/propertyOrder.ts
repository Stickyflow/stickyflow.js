const LAYOUT_ORDER = ['position', 'size', 'rotation', 'order'];

const STYLE_ORDER = [
  'shape',
  'fill',
  'stroke',
  'strokeWidth',
  'strokeStyle',
  'textColor',
  'color',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'textAlign',
  'verticalAlign',
  'cornerRadius',
  'dash',
  'shadow',
  'opacity',
  'blur',
  'blend',
  'icon',
  'route',
  'marker',
  'markerStart',
  'markerEnd',
  'asset',
];

const alphabetical = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function compareProps(a: string, b: string): number {
  const rank = (key: string) => (key === 'id' ? 0 : key === 'kind' ? 1 : key === 'text' ? 2 : 3);
  return rank(a) - rank(b) || alphabetical(a, b);
}

function compareByOrder(order: string[], a: string, b: string): number {
  const aIndex = order.indexOf(a);
  const bIndex = order.indexOf(b);
  const aRank = aIndex === -1 ? order.length : aIndex;
  const bRank = bIndex === -1 ? order.length : bIndex;
  return aRank - bRank || alphabetical(a, b);
}

export const compareLayoutProps = (a: string, b: string): number => compareByOrder(LAYOUT_ORDER, a, b);

export const compareStyleProps = (a: string, b: string): number => compareByOrder(STYLE_ORDER, a, b);
