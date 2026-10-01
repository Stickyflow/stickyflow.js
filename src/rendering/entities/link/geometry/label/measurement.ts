const LABEL_MAX_WIDTH = 250;
const LABEL_CHAR_WIDTH_RATIO = 0.65;
const LABEL_LINE_HEIGHT_RATIO = 1.4;

export function measureLinkLabel(text: string, fontSize: number): { width: number; height: number } {
  const charWidth = fontSize * LABEL_CHAR_WIDTH_RATIO;
  const lineHeight = fontSize * LABEL_LINE_HEIGHT_RATIO;
  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  const width = Math.max(fontSize * 1.8, Math.min(LABEL_MAX_WIDTH, maxLineLength * charWidth + 10));
  const lineCount = lines.reduce(
    (total, line) => total + Math.max(1, Math.ceil((line.length * charWidth) / LABEL_MAX_WIDTH)),
    0,
  );
  return {
    width,
    height: Math.max(lineHeight + 2, lineCount * lineHeight + 4),
  };
}
