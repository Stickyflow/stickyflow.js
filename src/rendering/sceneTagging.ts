import type { RenderNode, SceneRole } from './scene';

export function tag(
  nodes: RenderNode[],
  sfRole: SceneRole,
  sfId: string,
  sfKind?: string,
  ariaLabel?: string,
): RenderNode[] {
  nodes.forEach((node, index) => {
    node.sfRole = sfRole;
    node.sfId = sfId;
    if (sfKind) {
      node.sfKind = sfKind;
    }
    if (index === 0) {
      node.sfPrimary = true;
      if (ariaLabel) {
        node.ariaLabel = ariaLabel;
      }
    }
  });
  return nodes;
}
