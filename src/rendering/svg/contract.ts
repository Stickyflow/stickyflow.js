import type { RenderNode, SceneDetail, SceneIdentity } from '../scene';
import { num, xml } from './format';

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
    case 'chartSeries':
      return chartSeriesAttrs(detail);
    case 'link':
      return linkDetailAttrs(detail);
  }
}

function chartValueAttrs(detail: Extract<SceneDetail, { of: 'chartValue' }>): Array<string | undefined> {
  return [
    `data-sf-series="${xml(detail.series)}"`,
    `data-sf-value-index="${detail.valueIndex}"`,
    detail.mark ? `data-sf-mark="${detail.mark}"` : undefined,
    detail.radius !== undefined ? `data-sf-bar-radius="${num(detail.radius)}"` : undefined,
    detail.colorProp ? `data-sf-color-prop="${xml(detail.colorProp)}"` : undefined,
    detail.hasColorOverride ? 'data-sf-color-override="true"' : undefined,
  ];
}

function chartScaleAttrs(detail: Extract<SceneDetail, { of: 'chartScale' }>): string[] {
  return [`data-sf-value-scale="${detail.valueScale}"`];
}

function chartSeriesAttrs(detail: Extract<SceneDetail, { of: 'chartSeries' }>): string[] {
  return [`data-sf-series="${xml(detail.series)}"`];
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
    node.propKind ? `data-sf-prop-kind="${node.propKind}"` : undefined,
    label ? `tabindex="0" aria-label="${xml(label.replace(/\s+/g, ' ').trim())}"` : undefined,
  ].filter((attribute): attribute is string => attribute !== undefined);

  return attributes.length ? ` ${attributes.join(' ')}` : '';
}
