import type { RenderNode } from '../renderScene'
import { xml } from './format'

export function contractAttrs(node: RenderNode): string {
  const parts: string[] = [];
  if (node.sfRole) {
    parts.push(`data-sf-role="${node.sfRole}"`);
  }
  if (node.sfId) {
    parts.push(`data-sf-id="${xml(node.sfId)}"`);
  }
  if (node.sfKind) {
    parts.push(`data-sf-kind="${xml(node.sfKind)}"`);
  }
  if (node.sfPrimary) {
    parts.push('data-sf-primary="true"');
  }
  if (node.sfSeries) {
    parts.push(`data-sf-series="${xml(node.sfSeries)}"`);
  }
  if (node.sfValueIndex !== undefined) {
    parts.push(`data-sf-value-index="${node.sfValueIndex}"`);
  }
  if (node.sfValueScale) {
    parts.push(`data-sf-value-scale="${node.sfValueScale}"`);
  }
  if (node.sfFromId) {
    parts.push(`data-sf-from="${xml(node.sfFromId)}"`);
  }
  if (node.sfToId) {
    parts.push(`data-sf-to="${xml(node.sfToId)}"`);
  }
  if (node.sfRoute) {
    parts.push(`data-sf-route="${node.sfRoute}"`);
  }
  if (node.sfFromSide) {
    parts.push(`data-sf-from-side="${node.sfFromSide}"`);
  }
  if (node.sfToSide) {
    parts.push(`data-sf-to-side="${node.sfToSide}"`);
  }
  if (node.sfLabelGap) {
    parts.push('data-sf-label-gap="true"');
  }
  // aria-label is a single readable line: collapse newlines/whitespace from
  // multi-line entity text so no raw control chars land in the attribute.
  if (node.ariaLabel) {
    parts.push(`tabindex="0" aria-label="${xml(node.ariaLabel.replace(/\s+/g, ' ').trim())}"`);
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}
