import type { BlockKind, SflBlock, SflProperty } from '../ast';
import { type BlockEntries, collectBlockEntries } from './blockEntries';
import { emitComposition } from './composition';
import { emitBinding } from './expressions';
import { emitPropertyBlock } from './propertyBlock';
import { compareLayoutProps, compareProps, compareStyleProps } from './propertyOrder';
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

export function joinSiblingBlocks(blocks: SflBlock[], depth: number): string {
  const pad = INDENT.repeat(depth);
  const layouts = blocks.filter(block => block.kind === 'Layout');
  const styles = blocks.filter(block => block.kind === 'Style');
  const others = blocks.filter(block => block.kind !== 'Layout' && block.kind !== 'Style');
  const groups: string[] = [];

  if (layouts.length) {
    groups.push(`${pad}// Layout Definition\n${layouts.map(block => emitBlock(block, depth)).join('\n')}`);
  }
  if (styles.length) {
    groups.push(`${pad}// Style Definition\n${styles.map(block => emitBlock(block, depth)).join('\n')}`);
  }
  others.forEach(block => {
    groups.push(emitBlock(block, depth));
  });
  return groups.join('\n\n');
}

export function emitBlock(block: SflBlock, depth: number): string {
  const pad = INDENT.repeat(depth);
  const header = `${block.kind} ${block.name}${emitComposition(block.composition)} {`;
  const entries = collectBlockEntries(block);
  const properties = orderedProperties(block.kind, entries.properties);
  if (usesCompactBlockForm(block.kind, entries, properties.length)) {
    return emitCompactBlock(pad, header, properties);
  }
  const body = emitExpandedBlockBody(entries, properties, depth);
  return emitExpandedBlock(pad, header, body);
}

function orderedProperties(kind: BlockKind, properties: SflProperty[]): SflProperty[] {
  return [...properties].sort((left, right) => propertyComparator(kind)(left.key, right.key));
}

function usesCompactBlockForm(kind: BlockKind, entries: BlockEntries, propertyCount: number): boolean {
  const supportsCompactForm = kind === 'Layout' || kind === 'Style';
  const hasNestedContent =
    entries.blocks.length > 0 ||
    entries.layouts.length > 0 ||
    entries.styles.length > 0 ||
    entries.dataBlocks.length > 0 ||
    entries.fields.length > 0 ||
    entries.samples.length > 0 ||
    entries.bindings.length > 0;
  return supportsCompactForm && !hasNestedContent && propertyCount <= COMPACT_MAX_PROPS;
}

function emitCompactBlock(pad: string, header: string, properties: SflProperty[]): string {
  const body = properties.map(emitProperty).join('; ');
  return body ? `${pad}${header} ${body} }` : `${pad}${header} }`;
}

function emitExpandedBlockBody(entries: BlockEntries, properties: SflProperty[], depth: number): string {
  const primaryEntries = emitPrimaryBlockEntries(entries, properties, depth);
  const propertyBlocks = emitAttachedPropertyBlocks(entries, depth);
  return [primaryEntries, propertyBlocks].filter(Boolean).join('\n');
}

function emitPrimaryBlockEntries(entries: BlockEntries, properties: SflProperty[], depth: number): string {
  const innerPad = INDENT.repeat(depth + 1);
  const propertyLines = [
    ...properties.map(property => `${innerPad}${emitProperty(property)}`),
    ...entries.bindings.map(binding => `${innerPad}${emitBinding(binding)}`),
  ].join('\n');
  const nestedBlocks = joinSiblingBlocks(entries.blocks, depth + 1);
  return [propertyLines, nestedBlocks].filter(Boolean).join('\n\n');
}

function emitAttachedPropertyBlocks(entries: BlockEntries, depth: number): string {
  const fields = [
    ...entries.fields.map(properties => emitFieldsBlock('fields', properties, depth + 1)),
    ...entries.samples.map(properties => emitFieldsBlock('sample', properties, depth + 1)),
  ];
  const dataBlocks = entries.dataBlocks.map(data => emitDataBlock(data, depth + 1));
  const layouts = entries.layouts.map(layout => emitPropertyBlock('layout', layout.properties, depth + 1));
  const styles = entries.styles.map(style => emitPropertyBlock('style', style.properties, depth + 1));
  return [...fields, ...dataBlocks, ...layouts, ...styles].join('\n');
}

function emitFieldsBlock(name: 'fields' | 'sample', properties: SflProperty[], depth: number): string {
  const pad = INDENT.repeat(depth);
  const lines = properties.map(property => `${pad}${INDENT}${emitProperty(property)}`);
  return lines.length ? `${pad}${name} {\n${lines.join('\n')}\n${pad}}` : `${pad}${name} {\n${pad}}`;
}

function emitDataBlock(data: SflBlock, depth: number): string {
  const pad = INDENT.repeat(depth);
  const entries = collectBlockEntries(data);
  const properties = orderedProperties(data.kind, entries.properties);
  const body = emitExpandedBlockBody(entries, properties, depth);
  return emitExpandedBlock(pad, 'data {', body);
}

function emitExpandedBlock(pad: string, header: string, body: string): string {
  return body ? `${pad}${header}\n${body}\n${pad}}` : `${pad}${header}\n${pad}}`;
}
