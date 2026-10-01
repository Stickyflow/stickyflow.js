import type { BlockKind, SflBlock, SflProperty } from '../ast';
import { type BlockEntries, collectBlockEntries } from './blockEntries';
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
  const properties = orderedProperties(block.kind, entries.properties);
  if (usesCompactBlockForm(block.kind, entries, properties.length)) {
    return emitCompactBlock(pad, header, properties);
  }
  const body = emitExpandedBlockBody(entries, properties, depth, kinds);
  return emitExpandedBlock(pad, header, body);
}

function orderedProperties(kind: BlockKind, properties: SflProperty[]): SflProperty[] {
  return [...properties].sort((left, right) => propertyComparator(kind)(left.key, right.key));
}

function usesCompactBlockForm(kind: BlockKind, entries: BlockEntries, propertyCount: number): boolean {
  const supportsCompactForm = kind === 'Layout' || kind === 'Style';
  const hasNestedContent =
    entries.blocks.length > 0 || Boolean(entries.layout) || Boolean(entries.style) || Boolean(entries.data);
  return supportsCompactForm && !hasNestedContent && propertyCount <= COMPACT_MAX_PROPS;
}

function emitCompactBlock(pad: string, header: string, properties: SflProperty[]): string {
  const body = properties.map(emitProperty).join('; ');
  return body ? `${pad}${header} ${body} }` : `${pad}${header} }`;
}

function emitExpandedBlockBody(
  entries: BlockEntries,
  properties: SflProperty[],
  depth: number,
  kinds: Map<string, BlockKind>,
): string {
  const primaryEntries = emitPrimaryBlockEntries(entries, properties, depth, kinds);
  const propertyBlocks = emitAttachedPropertyBlocks(entries, depth, kinds);
  return [primaryEntries, propertyBlocks].filter(Boolean).join('\n');
}

function emitPrimaryBlockEntries(
  entries: BlockEntries,
  properties: SflProperty[],
  depth: number,
  kinds: Map<string, BlockKind>,
): string {
  const innerPad = INDENT.repeat(depth + 1);
  const propertyLines = properties.map(property => `${innerPad}${emitProperty(property)}`).join('\n');
  const nestedBlocks = joinSiblingBlocks(entries.blocks, depth + 1, kinds);
  return [propertyLines, nestedBlocks].filter(Boolean).join('\n\n');
}

function emitAttachedPropertyBlocks(entries: BlockEntries, depth: number, kinds: Map<string, BlockKind>): string {
  const blocks: string[] = [];
  if (entries.data) {
    blocks.push(emitDataBlock(entries.data, depth + 1, kinds));
  }
  if (entries.layout) {
    blocks.push(emitPropertyBlock('layout', entries.layout.properties, depth + 1));
  }
  if (entries.style) {
    blocks.push(emitPropertyBlock('style', entries.style.properties, depth + 1));
  }
  return blocks.join('\n');
}

function emitDataBlock(data: SflBlock, depth: number, kinds: Map<string, BlockKind>): string {
  const pad = INDENT.repeat(depth);
  const entries = collectBlockEntries(data);
  const properties = orderedProperties(data.kind, entries.properties);
  const body = emitExpandedBlockBody(entries, properties, depth, kinds);
  return emitExpandedBlock(pad, 'data {', body);
}

function emitExpandedBlock(pad: string, header: string, body: string): string {
  return body ? `${pad}${header}\n${body}\n${pad}}` : `${pad}${header}\n${pad}}`;
}
