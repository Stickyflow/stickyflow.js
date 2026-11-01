import type { RenderNode, ScenePaint, ScenePath } from '../renderScene/scene';

const HIT_WIDTH = 16;
const LINE_HIT_WIDTH_PX = 14;

function hitAreaFor(path: ScenePath, linkId: string): ScenePath {
  return {
    type: 'path',
    id: `link-hit-${linkId}`,
    order: path.order,
    rank: path.rank,
    sequence: path.sequence,
    bounds: path.bounds,
    d: path.d,
    identity: { role: 'link', id: linkId },
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#000000' },
      strokeWidth: HIT_WIDTH,
      opacity: 0,
      pointerEvents: 'stroke',
    },
  };
}

const isEmpty = (paint: ScenePaint | undefined) =>
  !paint ||
  paint.kind === 'none' ||
  (paint.kind === 'solid' && (paint.color === 'none' || paint.color === 'transparent'));

// A line without a fill can only be taken on its stroke, so it gets a wider one that stays the same size on the screen at any zoom.
function lineHitArea(node: RenderNode): RenderNode | null {
  if (node.type !== 'path' && node.type !== 'rect' && node.type !== 'ellipse') {
    return null;
  }
  const { identity, style } = node;
  if (
    !identity?.primary ||
    identity.role === 'link' ||
    style.pointerEvents ||
    isEmpty(style.stroke) ||
    !isEmpty(style.fill)
  ) {
    return null;
  }
  return {
    ...node,
    id: `line-hit-${node.id}`,
    identity: { role: identity.role, id: identity.id },
    detail: undefined,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#000000' },
      strokeWidth: LINE_HIT_WIDTH_PX,
      nonScalingStroke: true,
      opacity: 0,
      pointerEvents: 'stroke',
    },
  } as RenderNode;
}

const DIMENSION_LINE_HIT_WIDTH_PX = 20;
const LABEL_MARGIN = 4;

// A dimension is taken anywhere: on its line, its extension lines and its number.
function dimensionHitArea(node: RenderNode): RenderNode | null {
  if (node.identity?.role !== 'dimension') {
    return null;
  }
  const identity = { role: 'dimension' as const, id: node.identity.id };
  if (node.type === 'path') {
    return {
      ...node,
      id: `line-hit-${node.id}`,
      identity,
      detail: undefined,
      markerStart: undefined,
      markerEnd: undefined,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: '#000000' },
        strokeWidth: DIMENSION_LINE_HIT_WIDTH_PX,
        nonScalingStroke: true,
        opacity: 0,
        pointerEvents: 'stroke',
      },
    } as RenderNode;
  }
  if (node.type !== 'text') {
    return null;
  }
  const { x, y, width, height, rotation = 0, rotationCenter } = node;
  const center = rotationCenter ?? { x: x + width / 2, y: y + height / 2 };
  const angle = (rotation * Math.PI) / 180;
  const corner = (px: number, py: number) => {
    const dx = px - center.x;
    const dy = py - center.y;
    return `${center.x + dx * Math.cos(angle) - dy * Math.sin(angle)} ${center.y + dx * Math.sin(angle) + dy * Math.cos(angle)}`;
  };
  const [left, top, right, bottom] = [
    x - LABEL_MARGIN,
    y - LABEL_MARGIN,
    x + width + LABEL_MARGIN,
    y + height + LABEL_MARGIN,
  ];
  return {
    type: 'path',
    id: `line-hit-${node.id}`,
    order: node.order,
    rank: node.rank,
    sequence: node.sequence,
    bounds: node.bounds,
    d: `M ${corner(left, top)} L ${corner(right, top)} L ${corner(right, bottom)} L ${corner(left, bottom)} Z`,
    identity,
    style: { fill: { kind: 'solid', color: '#000000' }, opacity: 0, pointerEvents: 'all' },
  } as RenderNode;
}

export function withLinkHitAreas(nodes: RenderNode[]): RenderNode[] {
  return nodes.flatMap(node => {
    if (node.type === 'path' && node.identity?.role === 'link' && node.identity.primary) {
      return [node, hitAreaFor(node, node.identity.id)];
    }
    const dimension = dimensionHitArea(node);
    if (dimension) {
      return [node, dimension];
    }
    const line = lineHitArea(node);
    return line ? [node, line] : [node];
  });
}
