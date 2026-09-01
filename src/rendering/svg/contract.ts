import type { RenderNode, SceneDetail, SceneIdentity } from '../scene';
import { xml } from './format';

function identityAttrs(identity: SceneIdentity): Array<string | undefined> {
  return [
    `data-sf-role="${identity.role}"`,
    `data-sf-id="${xml(identity.id)}"`,
    identity.kind ? `data-sf-kind="${xml(identity.kind)}"` : undefined,
    identity.primary ? 'data-sf-primary="true"' : undefined,
  ];
}

function detailAttrs(detail: SceneDetail): Array<string | undefined> {
  if (detail.of === 'chartValue') {
    return [`data-sf-series="${xml(detail.series)}"`, `data-sf-value-index="${detail.valueIndex}"`];
  }
  if (detail.of === 'chartScale') {
    return [`data-sf-value-scale="${detail.valueScale}"`];
  }
  return [
    detail.fromId ? `data-sf-from="${xml(detail.fromId)}"` : undefined,
    detail.toId ? `data-sf-to="${xml(detail.toId)}"` : undefined,
    detail.route ? `data-sf-route="${detail.route}"` : undefined,
    detail.fromSide ? `data-sf-from-side="${detail.fromSide}"` : undefined,
    detail.toSide ? `data-sf-to-side="${detail.toSide}"` : undefined,
    detail.labelGap ? 'data-sf-label-gap="true"' : undefined,
  ];
}

export function contractAttrs(node: RenderNode): string {
  const label = node.identity?.label;
  const attributes = [
    ...(node.identity ? identityAttrs(node.identity) : []),
    ...(node.detail ? detailAttrs(node.detail) : []),
    label ? `tabindex="0" aria-label="${xml(label.replace(/\s+/g, ' ').trim())}"` : undefined,
  ].filter((attribute): attribute is string => attribute !== undefined);

  return attributes.length ? ` ${attributes.join(' ')}` : '';
}
