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
