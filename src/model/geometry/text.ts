// §1.4 Infographics inline **bold** markup (model/geometry/richText.ts):
// wrapRichLine/wrapRichText need a `measure(text, bold) => width` function.
// stickyflow-atlas has a real DOM canvas to call context.measureText() on;
// this package also has to run in Node (no canvas/DOM), so it reuses the
// same per-character heuristic as wrapText's `fontSize * .58` below instead
// of introducing a canvas dependency here. A bold glyph renders measurably
// wider than the same character at regular weight in most UI fonts - about
// 8-12% is typical - so the bold factor is the plain one bumped by roughly
// that much (.58 -> .64, an ~10% increase), keeping wrap boundaries close to
// real metrics without needing them.
const PLAIN_CHAR_FACTOR = .58
const BOLD_CHAR_FACTOR = .64

/** Glyph widths for one resolved (fontFamily, fontSize) pair. Deliberately the
 *  exact shape wrapRichLine/wrapRichText already take as parameters - and the
 *  exact shape stickyflow-atlas's own `createTextMeasurer` already returns - so
 *  a host with real canvas metrics can hand them straight over with no adapter
 *  in between. */
export interface TextMetrics {
  measure: (text: string, bold: boolean) => number
  spaceWidth: number
}

/** How a host supplies real glyph metrics to the renderer: called once per
 *  text node with that node's resolved font, returns the widths for it.
 *
 *  Left unset, the renderer falls back to the character-count heuristic below,
 *  which is what keeps output byte-identical across platforms (no font files,
 *  no canvas) and therefore what the golden SVGs pin. A browser host that cares
 *  more about matching its own live canvas than about cross-platform
 *  reproducibility passes a factory here instead. */
export type MeasureTextFactory = (fontFamily: string, fontSize: number) => TextMetrics

// Pure text-wrapping, shared by the static renderer (buildRenderScene.ts,
// for both shape and link labels) and a live resize preview
// (stickyflow/interaction's resizeDrag.ts), so a shape's label re-wraps
// identically whether it's "being resized" or "just rendered".
//
// `metrics` is optional on purpose: omitted, this keeps the character-count
// estimate the package has always used, so existing callers (and the golden
// SVGs) are unaffected. The two paths are NOT interchangeable - the heuristic
// floors `maxChars` once per text box, while a measured fit re-evaluates per
// word, so they round differently and can break the same string at different
// points. That difference is the whole reason the injection point exists.
export function wrapText(text: string, width: number, fontSize: number, metrics?: TextMetrics): string[] {
  const maxChars = Math.max(1, Math.floor(width / Math.max(1, fontSize * PLAIN_CHAR_FACTOR)))
  const fits = metrics
    ? (line: string, word: string) =>
      metrics.measure(line, false) + metrics.spaceWidth + metrics.measure(word, false) <= width
    : (line: string, word: string) => `${line} ${word}`.length <= maxChars
  const result: string[] = []
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean)
    if (!words.length) { result.push(''); continue }
    let line = ''
    for (const word of words) {
      if (!line) line = word
      else if (fits(line, word)) line += ` ${word}`
      else { result.push(line); line = word }
    }
    result.push(line)
  }
  return result
}

/** Character-count width estimate for one run of text at a given weight -
 *  the Node-safe stand-in for real glyph metrics, built from the same
 *  per-character factor wrapText uses for its own (always-plain) estimate. */
export function estimateTextWidth(text: string, fontSize: number, bold: boolean): number {
  return text.length * fontSize * (bold ? BOLD_CHAR_FACTOR : PLAIN_CHAR_FACTOR)
}

/** Builds the `measure`/`spaceWidth` pair wrapRichLine/wrapRichText expect,
 *  from this package's character-count heuristic rather than real canvas
 *  metrics (see estimateTextWidth above). */
export function heuristicRichMeasure(fontSize: number): TextMetrics {
  return {
    measure: (text: string, bold: boolean) => estimateTextWidth(text, fontSize, bold),
    spaceWidth: fontSize * PLAIN_CHAR_FACTOR,
  }
}
