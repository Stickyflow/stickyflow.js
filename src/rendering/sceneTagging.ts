import type { RenderNode, SceneRole } from './scene';

export function tag(nodes: RenderNode[], role: SceneRole, id: string, kind?: string, label?: string): RenderNode[] {
  nodes.forEach((node, index) => {
    node.identity = {
      role,
      id,
      ...(kind ? { kind } : {}),
      ...(index === 0 ? { primary: true } : {}),
      ...(index === 0 && label ? { label } : {}),
    };
  });
  return nodes;
}
