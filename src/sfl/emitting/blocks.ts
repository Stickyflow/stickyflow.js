import type { BlockKind, SflBlock } from '../ast';
import { collectBlockEntries } from './blockEntries';
import { emitComposition } from './composition';
import { compareLayoutProps, compareProps, compareStyleProps } from './order';
import { emitPropertyBlock } from './propertyBlock';
import { emitProperty } from './values';

const INDENT = '  ';
const COMPACT_MAX_PROPS = 3;

function propertyComparator(kind: BlockKind) {
  if (kind === 'Layout') {
    return compareLayoutProps;
  }
  if (kind === 'Style') {
    return compareStyleProps;
  }
  return compareProps;
}

export function joinSiblingBlocks(blocks: SflBlock[], depth: number, kinds: Map<string, BlockKind>): string {
  const pad = INDENT.repeat(depth);
  const layouts = blocks.filter(block => block.kind === 'Layout');
  const styles = blocks.filter(block => block.kind === 'Style');
  const others = blocks.filter(block => block.kind !== 'Layout' && block.kind !== 'Style');
  const groups: string[] = [];

  if (layouts.length) {
    groups.push(`${pad}// Layout Definition\n${layouts.map(block => emitBlock(block, depth, kinds)).join('\n')}`);
  }
  if (styles.length) {
    groups.push(`${pad}// Style Definition\n${styles.map(block => emitBlock(block, depth, kinds)).join('\n')}`);
  }
  others.forEach(block => {
    groups.push(emitBlock(block, depth, kinds));
  });
  return groups.join('\n\n');
}

export function emitBlock(block: SflBlock, depth: number, kinds: Map<string, BlockKind>): string {
  const pad = INDENT.repeat(depth);
  const header = `${block.kind} ${block.name}${emitComposition(block.composition, kinds)} {`;
  const entries = collectBlockEntries(block);
  const properties = [...entries.properties].sort((a, b) => propertyComparator(block.kind)(a.key, b.key));
  const compact =
    (block.kind === 'Layout' || block.kind === 'Style') &&
    !entries.blocks.length &&
    !entries.layout &&
    !entries.style &&
    properties.length <= COMPACT_MAX_PROPS;

  if (compact) {
    const body = properties.map(emitProperty).join('; ');
    return body ? `${pad}${header} ${body} }` : `${pad}${header} }`;
  }

  const innerPad = INDENT.repeat(depth + 1);
  let inner = properties.map(property => `${innerPad}${emitProperty(property)}`).join('\n');
  if (entries.blocks.length) {
    const nested = joinSiblingBlocks(entries.blocks, depth + 1, kinds);
    inner = inner ? `${inner}\n\n${nested}` : nested;
  }
  if (entries.layout) {
    const layout = emitPropertyBlock('layout', entries.layout.properties, depth + 1);
    inner = inner ? `${inner}\n${layout}` : layout;
  }
  if (entries.style) {
    const style = emitPropertyBlock('style', entries.style.properties, depth + 1);
    inner = inner ? `${inner}\n${style}` : style;
  }

  return inner ? `${pad}${header}\n${inner}\n${pad}}` : `${pad}${header}\n${pad}}`;
}
