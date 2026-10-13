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

export function roundedBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return (
    `M ${x + r} ${y} H ${x + width - r} Q ${x + width} ${y} ${x + width} ${y + r} ` +
    `V ${y + height - r} Q ${x + width} ${y + height} ${x + width - r} ${y + height} ` +
    `H ${x + r} Q ${x} ${y + height} ${x} ${y + height - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
  );
}

export function barPath(x: number, y: number, width: number, height: number, radius: number, roundedBottom: boolean): string {
  return roundedBottom ? roundedBarPath(x, y, width, height, radius) : barShapePath(x, y, width, height, radius);
}
