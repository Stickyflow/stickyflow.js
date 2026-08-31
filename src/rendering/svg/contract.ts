import type { RenderNode } from '../renderScene'
import { xml } from './format'

export function contractAttrs(node: RenderNode): string {
  const attributes = [
    node.sfRole ? `data-sf-role="${node.sfRole}"` : undefined,
    node.sfId ? `data-sf-id="${xml(node.sfId)}"` : undefined,
    node.sfKind ? `data-sf-kind="${xml(node.sfKind)}"` : undefined,
    node.sfPrimary ? 'data-sf-primary="true"' : undefined,
    node.sfSeries ? `data-sf-series="${xml(node.sfSeries)}"` : undefined,
    node.sfValueIndex !== undefined
      ? `data-sf-value-index="${node.sfValueIndex}"`
      : undefined,
    node.sfValueScale ? `data-sf-value-scale="${node.sfValueScale}"` : undefined,
    node.sfFromId ? `data-sf-from="${xml(node.sfFromId)}"` : undefined,
    node.sfToId ? `data-sf-to="${xml(node.sfToId)}"` : undefined,
    node.sfRoute ? `data-sf-route="${node.sfRoute}"` : undefined,
    node.sfFromSide ? `data-sf-from-side="${node.sfFromSide}"` : undefined,
    node.sfToSide ? `data-sf-to-side="${node.sfToSide}"` : undefined,
    node.sfLabelGap ? 'data-sf-label-gap="true"' : undefined,
    node.ariaLabel
      ? `tabindex="0" aria-label="${xml(node.ariaLabel.replace(/\s+/g, ' ').trim())}"`
      : undefined,
  ].filter((attribute): attribute is string => attribute !== undefined);

  return attributes.length ? ` ${attributes.join(' ')}` : '';
}
