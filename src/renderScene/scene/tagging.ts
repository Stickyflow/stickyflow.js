import type { RenderNode, SceneRole } from './types';

export function tag(
  nodes: RenderNode[],
  role: SceneRole,
  id: string,
  kind?: string,
  label?: string,
  parentFrameId?: string,
): RenderNode[] {
  nodes.forEach((node, index) => {
    node.identity = {
      role,
      id,
      ...(kind ? { kind } : {}),
      ...(index === 0 ? { primary: true } : {}),
      ...(index === 0 && label ? { label } : {}),
      ...(index === 0 && parentFrameId ? { parentFrameId } : {}),
    };
  });
  return nodes;
}
