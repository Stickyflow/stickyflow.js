import { resolveOwner, screenRectOf } from '../../dom';
import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import { ActiveTextEditor } from '../textEdit/activeEditor';
import { bindTextareaAutoGrow, createTextEditor } from '../textEdit/textarea';

interface SankeyNodeLabelTarget {
  owner: OwnerRef;
  nodeId: string;
  labelElement: SVGGraphicsElement;
}

function findLabelMark(event: MouseEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.('[data-sf-mark="sankey-node-label"]') as SVGGraphicsElement | null;
}

export function resolveSankeyNodeLabelTarget(event: MouseEvent): SankeyNodeLabelTarget | null {
  const labelElement = findLabelMark(event);
  if (!labelElement) {
    return null;
  }
  const owner = resolveOwner(labelElement);
  if (owner?.role !== 'chart') {
    return null;
  }
  const nodeId = labelElement.getAttribute('data-sf-series');
  if (!nodeId) {
    return null;
  }
  return { owner, nodeId, labelElement };
}

export function createSankeyNodeLabelEditor(
  target: SankeyNodeLabelTarget,
  emitter: Emitter,
  onClose: () => void,
): ActiveTextEditor | null {
  const rect = screenRectOf(target.labelElement);
  if (rect.width <= 0 && rect.height <= 0) {
    return null;
  }
  const originalText = target.labelElement.textContent ?? '';
  const fontSize = Number.parseFloat(target.labelElement.getAttribute('font-size') || '12');
  const textarea = createTextEditor({
    text: originalText,
    rect,
    fontSize,
    fontFamily: target.labelElement.getAttribute('font-family') || 'sans-serif',
  });

  return new ActiveTextEditor({
    textarea,
    originalText,
    commit: label => emitter.emit('sankeyNodeRename', { owner: target.owner, nodeId: target.nodeId, label }),
    unbindAutoGrow: bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6)),
    onClose,
  });
}
