export function topRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const clampedRadius = Math.max(0, Math.min(radius, width / 2, height));
  if (clampedRadius === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return `M ${x} ${y + clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x + clampedRadius} ${y} H ${x + width - clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x + width} ${y + clampedRadius} V ${y + height} H ${x} Z`;
}

export function bottomRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const clampedRadius = Math.max(0, Math.min(radius, width / 2, height));
  if (clampedRadius === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return `M ${x} ${y} H ${x + width} V ${y + height - clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x + width - clampedRadius} ${y + height} H ${x + clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x} ${y + height - clampedRadius} Z`;
}

export function leftRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const clampedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (clampedRadius === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return `M ${x} ${y + clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x + clampedRadius} ${y} H ${x + width} V ${y + height} H ${x + clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x} ${y + height - clampedRadius} Z`;
}

export function rightRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const clampedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (clampedRadius === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return `M ${x} ${y} H ${x + width - clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x + width} ${y + clampedRadius} V ${y + height - clampedRadius} A ${clampedRadius} ${clampedRadius} 0 0 1 ${x + width - clampedRadius} ${y + height} H ${x} Z`;
}

export interface RectCornerRadii {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export function cornersRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radii: RectCornerRadii,
): string {
  const max = Math.max(0, Math.min(width, height) / 2);
  const tl = Math.max(0, Math.min(radii.topLeft, max));
  const tr = Math.max(0, Math.min(radii.topRight, max));
  const br = Math.max(0, Math.min(radii.bottomRight, max));
  const bl = Math.max(0, Math.min(radii.bottomLeft, max));
  const arcTo = (r: number, toX: number, toY: number) => (r > 0 ? `A ${r} ${r} 0 0 1 ${toX} ${toY} ` : '');
  return (
    `M ${x + tl} ${y} H ${x + width - tr} ` +
    arcTo(tr, x + width, y + tr) +
    `V ${y + height - br} ` +
    arcTo(br, x + width - br, y + height) +
    `H ${x + bl} ` +
    arcTo(bl, x, y + height - bl) +
    `V ${y + tl} ` +
    arcTo(tl, x + tl, y) +
    'Z'
  );
}
