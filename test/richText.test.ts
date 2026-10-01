import { describe, expect, it } from 'vitest';
import {
  hasBoldMarkup,
  parseRichLine,
  parseRichText,
  wrapRichLine,
  wrapRichText,
} from '../src/rendering/scene/richTextLayout';

// Ported 1:1 from stickyflow-atlas's frontend/src/entities/shapes/ui/text/richText.test.ts
// (the reference implementation this file mirrors) - same test cases, same
// fixed-width-per-character fake measurer, so the wrap-boundary arithmetic is
// pinned identically in both repos without needing real font metrics here either.

describe('hasBoldMarkup', () => {
  it('detects a bold run', () => {
    expect(hasBoldMarkup('Output **doubled** this year.')).toBe(true);
  });
  it('is false for plain text', () => {
    expect(hasBoldMarkup('Output doubled this year.')).toBe(false);
  });
  it('is false for a lone unmatched **', () => {
    expect(hasBoldMarkup('a ** b')).toBe(false);
  });
});

describe('parseRichLine', () => {
  it('splits plain + bold + plain', () => {
    expect(parseRichLine('Output **doubled** this year.')).toEqual([
      { text: 'Output ', bold: false },
      { text: 'doubled', bold: true },
      { text: ' this year.', bold: false },
    ]);
  });
  it('returns a single plain run when there is no markup', () => {
    expect(parseRichLine('plain text')).toEqual([{ text: 'plain text', bold: false }]);
  });
  it('handles a line that is entirely bold', () => {
    expect(parseRichLine('**all bold**')).toEqual([{ text: 'all bold', bold: true }]);
  });
  it('handles two separate bold runs', () => {
    expect(parseRichLine('**a** and **b**')).toEqual([
      { text: 'a', bold: true },
      { text: ' and ', bold: false },
      { text: 'b', bold: true },
    ]);
  });
});

describe('parseRichText', () => {
  it('splits multi-line text into per-line runs', () => {
    expect(parseRichText('Line one\n**Line two**')).toEqual([
      [{ text: 'Line one', bold: false }],
      [{ text: 'Line two', bold: true }],
    ]);
  });
});

// A fixed-width-per-character measurer keeps the wrap-boundary math simple
// and deterministic to assert on, independent of any real font metrics.
const fixedMeasure = (text: string, bold: boolean) => text.length * (bold ? 12 : 10);
const fixedSpaceWidth = 10;

describe('wrapRichLine', () => {
  it('keeps short runs on one line', () => {
    const runs = [{ text: 'a b c', bold: false }];
    expect(wrapRichLine(runs, 1000, fixedMeasure, fixedSpaceWidth)).toEqual([
      [
        { text: 'a', bold: false },
        { text: 'b', bold: false },
        { text: 'c', bold: false },
      ],
    ]);
  });

  it('wraps to a new line once a word would exceed maxWidth', () => {
    // "aa"(20) + space(10) + "bb"(20) = 50 <= 50; + space(10) + "cc"(20) = 80 > 50 -> wraps
    const runs = [{ text: 'aa bb cc', bold: false }];
    expect(wrapRichLine(runs, 50, fixedMeasure, fixedSpaceWidth)).toEqual([
      [
        { text: 'aa', bold: false },
        { text: 'bb', bold: false },
      ],
      [{ text: 'cc', bold: false }],
    ]);
  });

  it('accounts for a bold word being wider than the same plain word', () => {
    // plain "bb" = 20, bold "bb" = 24 - a maxWidth that fits the plain
    // width but not the bold one must still wrap the bold word off.
    const plainRuns = [{ text: 'aa bb', bold: false }];
    const boldRuns = [
      { text: 'aa ', bold: false },
      { text: 'bb', bold: true },
    ];
    // aa(20) + space(10) + bb(20 plain / 24 bold) = 50 plain (fits 50), 54 bold (doesn't fit 50)
    expect(wrapRichLine(plainRuns, 50, fixedMeasure, fixedSpaceWidth)).toEqual([
      [
        { text: 'aa', bold: false },
        { text: 'bb', bold: false },
      ],
    ]);
    expect(wrapRichLine(boldRuns, 50, fixedMeasure, fixedSpaceWidth)).toEqual([
      [{ text: 'aa', bold: false }],
      [{ text: 'bb', bold: true }],
    ]);
  });

  it('never drops a single word wider than maxWidth (always makes progress)', () => {
    const runs = [{ text: 'averyveryverylongword', bold: false }];
    expect(wrapRichLine(runs, 10, fixedMeasure, fixedSpaceWidth)).toEqual([
      [{ text: 'averyveryverylongword', bold: false }],
    ]);
  });
});

describe('wrapRichText', () => {
  it('wraps each explicit \\n line independently', () => {
    const result = wrapRichText('aa bb cc\ndd', 50, fixedMeasure, fixedSpaceWidth);
    expect(result).toEqual([
      [
        { text: 'aa', bold: false },
        { text: 'bb', bold: false },
      ],
      [{ text: 'cc', bold: false }],
      [{ text: 'dd', bold: false }],
    ]);
  });
});
