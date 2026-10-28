import type { Frame } from '../../model/frame';
import type { RenderNode, SceneClip, SceneStyle } from './types';

interface Turn {
  angle: number;
  x: number;
  y: number;
}

const ARC_STEPS = 8;

// How an element is turned, for the clip: the clip of an element is drawn in the element's own turned space, so it has to be turned back.
function turnOf(node: RenderNode): Turn | undefined {
  const turned = node as {
    rotation?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    cx?: number;
    cy?: number;
    rotationCenter?: { x: number; y: number };
  };
  if (!turned.rotation) {
    return undefined;
  }
  if (turned.rotationCenter) {
    return { angle: turned.rotation, x: turned.rotationCenter.x, y: turned.rotationCenter.y };
  }
  if (turned.cx !== undefined && turned.cy !== undefined) {
    return { angle: turned.rotation, x: turned.cx, y: turned.cy };
  }
  if (turned.x !== undefined && turned.y !== undefined && turned.width !== undefined && turned.height !== undefined) {
    return { angle: turned.rotation, x: turned.x + turned.width / 2, y: turned.y + turned.height / 2 };
  }
  return undefined;
}

function roundedRectPoints(frame: Frame): Array<[number, number]> {
  const { x, y, width, height } = frame;
  const r = Math.max(0, Math.min(frame.cornerRadius, width / 2, height / 2));
  if (r === 0) {
    return [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ];
  }
  const corners: Array<[number, number, number]> = [
    [x + width - r, y + r, -90],
    [x + width - r, y + height - r, 0],
    [x + r, y + height - r, 90],
    [x + r, y + r, 180],
  ];
  return corners.flatMap(([cx, cy, start]) =>
    Array.from({ length: ARC_STEPS + 1 }, (_, step) => {
      const angle = ((start + (90 * step) / ARC_STEPS) * Math.PI) / 180;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
    }),
  );
}

function clipFor(frame: Frame, turn: Turn | undefined): SceneClip {
  if (!turn) {
    return { type: 'rect', x: frame.x, y: frame.y, width: frame.width, height: frame.height, rx: frame.cornerRadius };
  }
  const back = (-turn.angle * Math.PI) / 180;
  const cos = Math.cos(back);
  const sin = Math.sin(back);
  const points = roundedRectPoints(frame).map(([px, py]) => {
    const dx = px - turn.x;
    const dy = py - turn.y;
    return [turn.x + dx * cos - dy * sin, turn.y + dx * sin + dy * cos];
  });
  const round = (value: number) => Math.round(value * 100) / 100;
  return { type: 'path', d: `M${points.map(([px, py]) => `${round(px)} ${round(py)}`).join('L')}Z` };
}

// Everything that sits in a frame with `clip` is cut at the edge of the frame. Text has no style to carry a clip, so it is not cut.
export function applyFrameClips(nodes: RenderNode[], frames: readonly Frame[]): void {
  const clipping = new Map(frames.filter(frame => frame.clip).map(frame => [frame.id, frame]));
  if (clipping.size === 0) {
    return;
  }
  const inside = new Map<string, Frame>();
  for (const node of nodes) {
    const parent = node.identity?.parentFrameId;
    const frame = parent ? clipping.get(parent) : undefined;
    if (node.identity && frame) {
      inside.set(`${node.identity.role}:${node.identity.id}`, frame);
    }
  }
  for (const node of nodes) {
    const frame = node.identity ? inside.get(`${node.identity.role}:${node.identity.id}`) : undefined;
    const styled = node as { style?: SceneStyle };
    if (frame && styled.style) {
      const edge = clipFor(frame, turnOf(node));
      // An element that has a clip of its own, like the hull of a block, keeps it and is cut by the frame as well.
      styled.style = { ...styled.style, clip: styled.style.clip ? { ...styled.style.clip, within: edge } : edge };
    }
  }
}
