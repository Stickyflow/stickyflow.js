const PLAIN_CHAR_FACTOR = 0.58;
const BOLD_CHAR_FACTOR = 0.64;

export interface TextMetrics {
  measure: (text: string, bold: boolean) => number;
  spaceWidth: number;
}

export type MeasureTextFactory = (fontFamily: string, fontSize: number) => TextMetrics;

export function wrapText(text: string, width: number, fontSize: number, metrics?: TextMetrics): string[] {
  const maxChars = Math.max(1, Math.floor(width / Math.max(1, fontSize * PLAIN_CHAR_FACTOR)));
  const fits = metrics
    ? (line: string, word: string) =>
        metrics.measure(line, false) + metrics.spaceWidth + metrics.measure(word, false) <= width
    : (line: string, word: string) => `${line} ${word}`.length <= maxChars;
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      result.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (fits(line, word)) {
        line += ` ${word}`;
      } else {
        result.push(line);
        line = word;
      }
    }
    result.push(line);
  }
  return result;
}

export function estimateTextWidth(text: string, fontSize: number, bold: boolean): number {
  return text.length * fontSize * (bold ? BOLD_CHAR_FACTOR : PLAIN_CHAR_FACTOR);
}

export function heuristicRichMeasure(fontSize: number): TextMetrics {
  return {
    measure: (text: string, bold: boolean) => estimateTextWidth(text, fontSize, bold),
    spaceWidth: fontSize * PLAIN_CHAR_FACTOR,
  };
}
