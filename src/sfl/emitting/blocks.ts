import type {
  BlockKind,
  SflBlock,
  SflLayout,
  SflProperty,
  SflStyle,
} from '../ast'
import { emitComposition } from './index'
import { compareLayoutProps, compareProps, compareStyleProps } from './order'
import { emitProperty } from './values'

const INDENT = '  '
const COMPACT_MAX_PROPS = 3

interface BlockEntries {
  properties: SflProperty[]
  blocks: SflBlock[]
  layout?: SflLayout
  style?: SflStyle
}

function collectEntries(block: SflBlock): BlockEntries {
  const result: BlockEntries = { properties: [], blocks: [] }
  for (const entry of block.entries) {
    if (entry.type === 'property') result.properties.push(entry.property)
    else if (entry.type === 'block') result.blocks.push(entry.block)
    else if (entry.type === 'layout') result.layout = entry.layout
    else result.style = entry.style
  }
  return result
}

function propertyComparator(kind: BlockKind) {
  if (kind === 'Layout') return compareLayoutProps
  if (kind === 'Style') return compareStyleProps
  return compareProps
}

function emitPropertyBlock(
  name: 'layout' | 'style',
  properties: SflProperty[],
  depth: number,
): string {
  const pad = INDENT.repeat(depth)
  const innerPad = INDENT.repeat(depth + 1)
  const compare = name === 'layout' ? compareLayoutProps : compareStyleProps
  const lines = [...properties]
    .sort((a, b) => compare(a.key, b.key))
    .map(property => `${innerPad}${emitProperty(property)}`)
  return lines.length
    ? `${pad}${name} {\n${lines.join('\n')}\n${pad}}`
    : `${pad}${name} {\n${pad}}`
}

export function joinSiblingBlocks(
  blocks: SflBlock[],
  depth: number,
  kinds: Map<string, BlockKind>,
): string {
  const pad = INDENT.repeat(depth)
  const layouts = blocks.filter(block => block.kind === 'Layout')
  const styles = blocks.filter(block => block.kind === 'Style')
  const others = blocks.filter(block => block.kind !== 'Layout' && block.kind !== 'Style')
  const groups: string[] = []

  if (layouts.length) {
    groups.push(`${pad}// Layout Definition\n${layouts.map(block => emitBlock(block, depth, kinds)).join('\n')}`)
  }
  if (styles.length) {
    groups.push(`${pad}// Style Definition\n${styles.map(block => emitBlock(block, depth, kinds)).join('\n')}`)
  }
  others.forEach(block => groups.push(emitBlock(block, depth, kinds)))
  return groups.join('\n\n')
}

export function emitBlock(block: SflBlock, depth: number, kinds: Map<string, BlockKind>): string {
  const pad = INDENT.repeat(depth)
  const header = `${block.kind} ${block.name}${emitComposition(block.composition, kinds)} {`
  const entries = collectEntries(block)
  const properties = [...entries.properties]
    .sort((a, b) => propertyComparator(block.kind)(a.key, b.key))
  const compact = (block.kind === 'Layout' || block.kind === 'Style')
    && !entries.blocks.length
    && !entries.layout
    && !entries.style
    && properties.length <= COMPACT_MAX_PROPS

  if (compact) {
    const body = properties.map(emitProperty).join('; ')
    return body ? `${pad}${header} ${body} }` : `${pad}${header} }`
  }

  const innerPad = INDENT.repeat(depth + 1)
  let inner = properties.map(property => `${innerPad}${emitProperty(property)}`).join('\n')
  if (entries.blocks.length) {
    const nested = joinSiblingBlocks(entries.blocks, depth + 1, kinds)
    inner = inner ? `${inner}\n\n${nested}` : nested
  }
  if (entries.layout) {
    const layout = emitPropertyBlock('layout', entries.layout.properties, depth + 1)
    inner = inner ? `${inner}\n${layout}` : layout
  }
  if (entries.style) {
    const style = emitPropertyBlock('style', entries.style.properties, depth + 1)
    inner = inner ? `${inner}\n${style}` : style
  }

  return inner
    ? `${pad}${header}\n${inner}\n${pad}}`
    : `${pad}${header}\n${pad}}`
}
