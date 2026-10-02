import { estimateTextWidth, wrapText } from '../../../renderScene/scene/textLayout';
import type { ResizeTextCapture } from './textCapture';

export interface TextFit {
  rawText: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  longestWord: number;
}

export function captureTextFit(text: ResizeTextCapture): TextFit {
  const fontSize = Number.parseFloat(text.el.getAttribute('font-size') || '14');
  const bold = text.el.getAttribute('font-weight') === 'bold';
  const lineHeight = Number(text.el.getAttribute('data-sf-line-height')) || 1.3;
  const words = text.rawText.split(/\s+/).filter(Boolean);
  return {
    rawText: text.rawText,
    fontSize,
    lineHeight,
    padding: Math.max(8, text.strokeWidth * 2),
    longestWord: Math.max(0, ...words.map(word => estimateTextWidth(word, fontSize, bold))),
  };
}

const COMMIT_PRECISION = 10;

function roundUpForCommit(value: number): number {
  return Math.ceil(value * COMMIT_PRECISION - 1e-9) / COMMIT_PRECISION;
}

export function minWidthForText(fit: TextFit): number {
  return roundUpForCommit(fit.longestWord + fit.padding * 2);
}

export function minHeightForText(fit: TextFit, width: number): number {
  const lines = wrapText(fit.rawText, Math.max(0, width - fit.padding * 2), fit.fontSize);
  return roundUpForCommit(lines.length * fit.fontSize * fit.lineHeight + fit.padding * 2);
}
