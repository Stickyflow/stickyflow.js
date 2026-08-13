// SFL 1.4 §1.4 Infographics: inline `**bold**` runs inside the existing
// `Entity.text` property - deliberately NOT a new block kind (a Figma/
// Illustrator text layer isn't its own object class either, just a property
// on the layer). Because it's just characters inside the same string SFL
// already round-trips as `text:`, no parser/emitter/model change is needed
// anywhere - this file is pure text layout, framework-free (mirrors
// stickyflow-atlas's frontend/src/entities/shapes/ui/text/richText.ts, which
// this was ported from 1:1).

export interface TextRun {
  text: string;
  bold: boolean;
}

const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

export function hasBoldMarkup(text: string): boolean {
  return /\*\*[^*]+\*\*/.test(text);
}

/** Splits one line into alternating plain/bold runs. A line with no `**…**`
 *  at all comes back as a single plain run, so callers never need to special-
 *  case "no markup" separately from "one plain run". */
export function parseRichLine(line: string): TextRun[] {
  const runs: TextRun[] = [];
  let lastIndex = 0;
  BOLD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BOLD_PATTERN.exec(line))) {
    if (match.index > lastIndex) runs.push({ text: line.slice(lastIndex, match.index), bold: false });
    if (match[1]) runs.push({ text: match[1], bold: true });
    lastIndex = BOLD_PATTERN.lastIndex;
  }
  if (lastIndex < line.length) runs.push({ text: line.slice(lastIndex), bold: false });
  return runs.length ? runs : [{ text: line, bold: false }];
}

export function parseRichText(text: string): TextRun[][] {
  return text.split('\n').map(parseRichLine);
}

export interface RichWord {
  text: string;
  bold: boolean;
}

/** Runs -> words, style preserved per word. Whitespace inside/between runs is
 *  purely a word boundary here (dropped, same as wrapText's own plain-text
 *  behavior above) - wrapRichLine re-inserts single spaces of its own between
 *  words when it lays a line back out. */
function runsToWords(runs: TextRun[]): RichWord[] {
  const words: RichWord[] = [];
  for (const run of runs) {
    for (const word of run.text.split(/\s+/)) {
      if (word) words.push({ text: word, bold: run.bold });
    }
  }
  return words;
}

/** Greedy word-wrap across styled runs, using a caller-supplied measurement
 *  function so a bold word's wider glyphs are accounted for. stickyflow-atlas
 *  passes real canvas metrics; this package (which also has to run headless
 *  in Node) passes the character-count heuristic from
 *  `text.ts`'s `heuristicRichMeasure` instead - see that file for why. */
export function wrapRichLine(
  runs: TextRun[],
  maxWidth: number,
  measure: (text: string, bold: boolean) => number,
  spaceWidth: number,
): RichWord[][] {
  const words = runsToWords(runs);
  if (!words.length) return [[]];
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
