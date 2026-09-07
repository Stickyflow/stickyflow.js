export function barShapePath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return (
    `M ${x} ${y + r} ` +
    `Q ${x} ${y} ${x + r} ${y} ` +
    `H ${x + width - r} ` +
    `Q ${x + width} ${y} ${x + width} ${y + r} ` +
    `V ${y + height} ` +
    `H ${x} Z`
  );
}
