import type { BlockKind, SflBlock, SflDocument } from '../ast'

export function buildKindIndex(doc: SflDocument): Map<string, BlockKind> {
  const kinds = new Map<string, BlockKind>()
  const visit = (blocks: SflBlock[]) => {
    for (const block of blocks) {
      if (!kinds.has(block.name)) kinds.set(block.name, block.kind)
      visit(block.entries.flatMap(entry => entry.type === 'block' ? [entry.block] : []))
    }
  }
  visit(doc.blocks)
  return kinds
}

export function emitComposition(composition: string[], kinds: Map<string, BlockKind>): string {
  if (!composition.length) return ''
  const styles = composition.filter(reference => kinds.get(reference) === 'Style')
  const layouts = composition.filter(reference => kinds.get(reference) === 'Layout')
  const unresolved = composition.filter(reference => {
    const kind = kinds.get(reference)
    return kind !== 'Style' && kind !== 'Layout'
  })
  return ` : ${[...styles, ...layouts, ...unresolved].join(' & ')}`
}
