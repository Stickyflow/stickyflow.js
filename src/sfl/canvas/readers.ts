import type { SflBlock, SflDocument, SflValue } from '../ast';
import type { SflDiagnostic } from './types';

export const asString = (v?: SflValue): string | undefined => {
  if (!v) return undefined;
  if (v.type === 'string') return v.value;
  if (v.type === 'ident') return v.segments.join('.');
  if (v.type === 'number') return String(v.value);
  return undefined;
};

export const asNumber = (v?: SflValue): number | undefined => (v && v.type === 'number' ? v.value : undefined);

export const tupleVals = (v?: SflValue): number[] | undefined => (v && v.type === 'tuple' ? v.values : undefined);

export const listNumbers = (v?: SflValue): number[] | undefined =>
  v && v.type === 'list' ? v.values.flatMap(item => (item.type === 'number' ? [item.value] : [])) : undefined;

export function directProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'property') out.set(e.property.key, e.property.value);
  return out;
}

export function styleSubBlockProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'style') for (const p of e.style.properties) out.set(p.key, p.value);
  return out;
}

export function localLayoutProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'layout') for (const p of e.layout.properties) out.set(p.key, p.value);
  return out;
}

export const childBlocks = (block: SflBlock): SflBlock[] =>
  block.entries.filter(e => e.type === 'block').map(e => (e as any).block as SflBlock);

export function classifyRefs(
  composition: string[],
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): { styleRef?: string; layoutRef?: string } {
  let styleRef: string | undefined;
  let layoutRef: string | undefined;
  for (const ref of composition) {
    if (styleBlocks.has(ref)) styleRef = ref;
    else if (layoutBlocks.has(ref)) layoutRef = ref;
  }
  return { styleRef, layoutRef };
}

export function collectUnresolvedRefs(
  doc: SflDocument,
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];
  const visit = (block: SflBlock) => {
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
    for (const child of childBlocks(block)) visit(child);
  };
  for (const block of doc.blocks) visit(block);
  return diagnostics;
}
