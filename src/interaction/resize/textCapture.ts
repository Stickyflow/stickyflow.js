import { isTextLabel } from '../../domContract';

export interface ResizeTextCapture {
  el: SVGTextElement;
  rawText: string;
  strokeWidth: number;
}

export function captureResizeText(nodes: SVGGraphicsElement[], primary: SVGGraphicsElement): ResizeTextCapture | null {
  const textElement = nodes.find(isTextLabel) as SVGTextElement | undefined;
  const rawText = primary.getAttribute('aria-label');
  if (!textElement || !rawText) {
    return null;
  }

  return {
    el: textElement,
    rawText,
    strokeWidth: Number(primary.getAttribute('stroke-width')) || 2,
  };
}
