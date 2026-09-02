export interface TextRun {
  text: string;
  bold: boolean;
}

const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

export function hasBoldMarkup(text: string): boolean {
  return /\*\*[^*]+\*\*/.test(text);
}

export function parseRichLine(line: string): TextRun[] {
  const runs: TextRun[] = [];
  let lastIndex = 0;
  BOLD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: canonical RegExp.exec loop
  while ((match = BOLD_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      runs.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    if (match[1]) {
      runs.push({ text: match[1], bold: true });
    }
    lastIndex = BOLD_PATTERN.lastIndex;
  }
  if (lastIndex < line.length) {
    runs.push({ text: line.slice(lastIndex), bold: false });
  }
  return runs.length ? runs : [{ text: line, bold: false }];
}

export function parseRichText(text: string): TextRun[][] {
  return text.split('\n').map(parseRichLine);
}

export interface RichWord {
  text: string;
  bold: boolean;
}

function runsToWords(runs: TextRun[]): RichWord[] {
  const words: RichWord[] = [];
  for (const run of runs) {
    for (const word of run.text.split(/\s+/)) {
      if (word) {
        words.push({ text: word, bold: run.bold });
      }
    }
  }
  return words;
}

export function wrapRichLine(
  runs: TextRun[],
  maxWidth: number,
  measure: (text: string, bold: boolean) => number,
  spaceWidth: number,
): RichWord[][] {
  const words = runsToWords(runs);
  if (!words.length) {
    return [[]];
  }
  const lines: RichWord[][] = [];
  let current: RichWord[] = [];
  let currentWidth = 0;
  for (const word of words) {
    const wordWidth = measure(word.text, word.bold);
    const addedWidth = current.length ? spaceWidth + wordWidth : wordWidth;
    if (current.length && currentWidth + addedWidth > maxWidth) {
      lines.push(current);
      current = [word];
      currentWidth = wordWidth;
    } else {
      current.push(word);
      currentWidth += addedWidth;
    }
  }
  lines.push(current);
  return lines;
}

export function wrapRichText(
  text: string,
  maxWidth: number,
  measure: (text: string, bold: boolean) => number,
  spaceWidth: number,
): RichWord[][] {
  return parseRichText(text).flatMap(runs => wrapRichLine(runs, Math.max(1, maxWidth), measure, spaceWidth));
}
