// Low-level scene-building helpers with no family of their own - every
// builder (shapes, links, containers, paths, charts) uses these, so they
// live below all of them rather than inside any one. Pulled out of
// buildRenderScene.ts specifically so a family module (charts.ts) can import
// them without importing buildRenderScene.ts itself, which would import the
// family module right back (buildRenderScene dispatches to it) - a circular
// import between the two.
import type { GradientColorObject, MeshGradientObject } from '../model/shapes';
import type { PathPoint } from '../model/paths';
import type { Bounds, RenderDiagnostic, RenderNode, ScenePaint, SceneRole } from './renderScene';

export const DEFAULT_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const EMPTY_BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

export const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const orderOf = (entity: { order_key?: string; orderKey?: string; order?: number }, fallback: number): number => {
  const key = entity.order_key ?? entity.orderKey;
  if (!key && typeof entity.order === 'number') return entity.order;
  if (!key) return fallback;
  let rank = 0;
  for (let i = 0; i < Math.min(key.length, 8); i++) rank = rank * 128 + key.charCodeAt(i);
  return rank;
};

export const boxBounds = (x: number, y: number, width: number, height: number, extra = 0): Bounds => ({
  minX: x - extra, minY: y - extra, maxX: x + width + extra, maxY: y + height + extra,
});

export function rotatedBounds(x: number, y: number, width: number, height: number, degrees: number, extra = 0): Bounds {
  if (!degrees) return boxBounds(x, y, width, height, extra);
  const cx = x + width / 2, cy = y + height / 2;
  const angle = degrees * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const corners = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  const rotated = corners.map(([px, py]) => ({
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos,
  }));
  return {
    minX: Math.min(...rotated.map(p => p.x)) - extra,
    minY: Math.min(...rotated.map(p => p.y)) - extra,
    maxX: Math.max(...rotated.map(p => p.x)) + extra,
    maxY: Math.max(...rotated.map(p => p.y)) + extra,
  };
}

export function paint(value: string | GradientColorObject | MeshGradientObject | null | undefined, diagnostics: RenderDiagnostic[], entityId: string): ScenePaint {
  if (!value) return { kind: 'none' };
  if (typeof value === 'string') return { kind: 'solid', color: value };
  if (value.type === 'gradient') {
    return { kind: 'linear-gradient', angle: value.angle, stops: value.stops.map(s => ({ offset: s.position, color: s.color })) };
  }
  if (!value.points.length) {
    diagnostics.push({ severity: 'warning', code: 'empty-mesh-gradient', entityId, message: 'Mesh gradient has no color points.' });
    return { kind: 'none' };
  }
  return {
    kind: 'mesh-gradient',
    points: value.points.map(point => ({ x: point.x, y: point.y, color: point.color })),
  };
}

export function freeformPathData(points: PathPoint[], tension: number, closed: boolean): string {
  if (!points.length) return '';
  if (points.length < 3 || tension <= 0) {
    return `M ${points[0].x} ${points[0].y} ${points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ')}${closed ? ' Z' : ''}`;
  }
  const pointAt = (index: number): PathPoint => closed
    ? points[(index + points.length) % points.length]
    : points[Math.max(0, Math.min(points.length - 1, index))];
  const segmentCount = closed ? points.length : points.length - 1;
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < segmentCount; i++) {
    const p0 = pointAt(i - 1), p1 = pointAt(i), p2 = pointAt(i + 1), p3 = pointAt(i + 2);
    const factor = tension / 6;
    commands.push(`C ${p1.x + (p2.x - p0.x) * factor} ${p1.y + (p2.y - p0.y) * factor} ${p2.x - (p3.x - p1.x) * factor} ${p2.y - (p3.y - p1.y) * factor} ${p2.x} ${p2.y}`);
  }
  if (closed) commands.push('Z');
  return commands.join(' ');
}

// Interactive DOM contract (ADR-03): stamp every node of an owner with a shared
// role + id so the viewer can map any sub-node (text, divider, cell) back to its
// entity. The first (primary) node is always marked sfPrimary — unconditionally,
// not just when an ariaLabel happens to be given (a title-less frame/table or a
// swimlane, which never gets one, still needs a single node the viewer can paint
// a selection indicator onto) — and additionally becomes focusable when a label
// is available.
export function tag(nodes: RenderNode[], sfRole: SceneRole, sfId: string, sfKind?: string, ariaLabel?: string): RenderNode[] {
  nodes.forEach((node, index) => {
    node.sfRole = sfRole;
    node.sfId = sfId;
    if (sfKind) node.sfKind = sfKind;
    if (index === 0) {
      node.sfPrimary = true;
      if (ariaLabel) node.ariaLabel = ariaLabel;
    }
  });
  return nodes;
}
