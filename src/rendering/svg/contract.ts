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
  switch (detail.of) {
    case 'chartValue':
      return chartValueAttrs(detail);
    case 'chartScale':
      return chartScaleAttrs(detail);
    case 'link':
      return linkDetailAttrs(detail);
  }
}

function chartValueAttrs(detail: Extract<SceneDetail, { of: 'chartValue' }>): string[] {
  return [`data-sf-series="${xml(detail.series)}"`, `data-sf-value-index="${detail.valueIndex}"`];
}

function chartScaleAttrs(detail: Extract<SceneDetail, { of: 'chartScale' }>): string[] {
  return [`data-sf-value-scale="${detail.valueScale}"`];
}

function linkDetailAttrs(detail: Extract<SceneDetail, { of: 'link' }>): Array<string | undefined> {
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
    node.prop ? `data-sf-prop="${xml(node.prop)}"` : undefined,
    label ? `tabindex="0" aria-label="${xml(label.replace(/\s+/g, ' ').trim())}"` : undefined,
  ].filter((attribute): attribute is string => attribute !== undefined);

  return attributes.length ? ` ${attributes.join(' ')}` : '';
}
