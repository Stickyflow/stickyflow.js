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
