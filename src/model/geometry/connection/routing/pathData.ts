import type { PathSegment } from '../../router';

export function roundedOrthogonalPathData(segments: PathSegment[], radius: number): string {
  if (segments.length === 0) {
    return '';
  }
  const raw = [segments[0].start, ...segments.map(segment => segment.end)];
  const points = raw.filter(
    (point, index) => index === 0 || point.x !== raw[index - 1].x || point.y !== raw[index - 1].y,
  );
  const corners = points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return true;
    }
    const previous = points[index - 1];
    const next = points[index + 1];
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
  if (corners.length < 2) {
    return '';
  }

  let pathData = `M ${corners[0].x} ${corners[0].y}`;
  for (let index = 1; index < corners.length - 1; index++) {
    const previous = corners[index - 1];
    const corner = corners[index];
    const next = corners[index + 1];
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y);
    if (incoming === 0 || outgoing === 0) {
      pathData += ` L ${corner.x} ${corner.y}`;
      continue;
    }
    const cornerRadius = Math.min(radius, incoming * 0.4, outgoing * 0.4);
    const before = {
      x: corner.x + ((previous.x - corner.x) / incoming) * cornerRadius,
      y: corner.y + ((previous.y - corner.y) / incoming) * cornerRadius,
    };
    const after = {
      x: corner.x + ((next.x - corner.x) / outgoing) * cornerRadius,
      y: corner.y + ((next.y - corner.y) / outgoing) * cornerRadius,
    };
    pathData += ` L ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y}`;
  }
  const last = corners[corners.length - 1];
  return `${pathData} L ${last.x} ${last.y}`;
}
