// A bar sits on a baseline : rounding all four corners the way a plain
// `rect rx=".."` does makes it look like it's floating. Real chart libraries
// round only the two corners furthest from the baseline. SVG has no
// selective-corner rect, so a bar with a radius is a path instead - `Q`
// corners, same convention `document`'s wave uses in model/geometry/shapes.ts.
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
