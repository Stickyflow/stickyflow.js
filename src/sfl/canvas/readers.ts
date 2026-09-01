import type { SflBlock, SflDocument, SflValue } from '../ast';
import type { SflDiagnostic } from './types';

export const asString = (value?: SflValue): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value.type === 'string') {
    return value.value;
  }
  if (value.type === 'ident') {
    return value.segments.join('.');
  }
  if (value.type === 'number') {
    return String(value.value);
  }
  return undefined;
};

export const asNumber = (value?: SflValue): number | undefined => (value?.type === 'number' ? value.value : undefined);

export const tupleVals = (value?: SflValue): number[] | undefined =>
  value?.type === 'tuple' ? value.values : undefined;

export const listNumbers = (value?: SflValue): number[] | undefined =>
  value?.type === 'list' ? value.values.flatMap(item => (item.type === 'number' ? [item.value] : [])) : undefined;

export function directProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const entry of block.entries) {
    if (entry.type === 'property') {
      out.set(entry.property.key, entry.property.value);
    }
  }
  return out;
}

export function styleSubBlockProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const entry of block.entries) {
    if (entry.type === 'style') {
      for (const property of entry.style.properties) {
        out.set(property.key, property.value);
      }
    }
  }
  return out;
}

export function localLayoutProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const entry of block.entries) {
    if (entry.type === 'layout') {
      for (const property of entry.layout.properties) {
        out.set(property.key, property.value);
      }
    }
  }
  return out;
}

export const childBlocks = (block: SflBlock): SflBlock[] =>
  block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []));

export function classifyRefs(
  composition: string[],
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): { styleRef?: string; layoutRef?: string } {
  let styleRef: string | undefined;
  let layoutRef: string | undefined;
  for (const ref of composition) {
    if (styleBlocks.has(ref)) {
      styleRef = ref;
    } else if (layoutBlocks.has(ref)) {
      layoutRef = ref;
    }
  }
  return { styleRef, layoutRef };
}

export function collectUnresolvedRefs(
  doc: SflDocument,
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];
  const visit = (block: SflBlock): void => {
    for (const ref of block.composition) {
      if (!styleBlocks.has(ref) && !layoutBlocks.has(ref)) {
        diagnostics.push({
          severity: 'warning',
          code: 'unresolved-style-or-layout',
          entityId: block.name,
          message: `"${ref}" is not a Style or Layout defined at the top level of the document — "${block.name}" gets no shape, fill, or stroke from it.`,
        });
      }
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };
  for (const block of doc.blocks) {
    visit(block);
  }
  return diagnostics;
}
