// Pure text-wrapping, shared by the static renderer (buildRenderScene.ts,
// for both shape and link labels) and a live resize preview
// (stickyflow/interaction's resizeDrag.ts), so a shape's label re-wraps
// identically whether it's "being resized" or "just rendered".
export function wrapText(text: string, width: number, fontSize: number): string[] {
  const maxChars = Math.max(1, Math.floor(width / Math.max(1, fontSize * .58)))
  const result: string[] = []
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean)
    if (!words.length) { result.push(''); continue }
    let line = ''
    for (const word of words) {
      if (!line) line = word
      else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`
      else { result.push(line); line = word }
    }
    result.push(line)
  }
  return result
}

// §1.4 Infographics inline **bold** markup (model/geometry/richText.ts):
// wrapRichLine/wrapRichText need a `measure(text, bold) => width` function.
// stickyflow-atlas has a real DOM canvas to call context.measureText() on;
// this package also has to run in Node (no canvas/DOM), so it reuses the
// same per-character heuristic as wrapText's `fontSize * .58` above instead
// of introducing a canvas dependency here. A bold glyph renders measurably
// wider than the same character at regular weight in most UI fonts - about
// 8-12% is typical - so the bold factor is the plain one bumped by roughly
// that much (.58 -> .64, an ~10% increase), keeping wrap boundaries close to
// real metrics without needing them.
const PLAIN_CHAR_FACTOR = .58
const BOLD_CHAR_FACTOR = .64

/** Character-count width estimate for one run of text at a given weight -
 *  the Node-safe stand-in for real glyph metrics, built from the same
 *  per-character factor wrapText uses for its own (always-plain) estimate. */
export function estimateTextWidth(text: string, fontSize: number, bold: boolean): number {
  return text.length * fontSize * (bold ? BOLD_CHAR_FACTOR : PLAIN_CHAR_FACTOR)
}

/** Builds the `measure`/`spaceWidth` pair wrapRichLine/wrapRichText expect,
 *  from this package's character-count heuristic rather than real canvas
 *  metrics (see estimateTextWidth above). */
export function heuristicRichMeasure(fontSize: number): { measure: (text: string, bold: boolean) => number; spaceWidth: number } {
  return {
    measure: (text: string, bold: boolean) => estimateTextWidth(text, fontSize, bold),
    spaceWidth: fontSize * PLAIN_CHAR_FACTOR,
  }
}
