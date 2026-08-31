import type { SflBlock, SflDocument, SflValue } from '../ast';
import type { SflDiagnostic } from './types';

export const asString = (v?: SflValue): string | undefined => {
  if (!v) return undefined;
  if (v.type === 'string') return v.value;
  if (v.type === 'ident') return v.segments.join('.');
  if (v.type === 'number') return numStr(v.value);
  return undefined;
};

export const asNumber = (v?: SflValue): number | undefined =>
  v && v.type === 'number' ? v.value : undefined;

export const tupleVals = (v?: SflValue): number[] | undefined =>
  v && v.type === 'tuple' ? v.values : undefined;

// `segments: [10, 20, 30]` (bracketed) — a `list`, not a `tuple` (§7.1), so
// tupleVals doesn't cover it. asString() also doesn't (only string/ident/
// number), which is why this needed its own reader instead of flowing
// through the generic string-props map like most Link properties.
export const listNumbers = (v?: SflValue): number[] | undefined =>
  v && v.type === 'list' ? v.values.flatMap(item => item.type === 'number' ? [item.value] : []) : undefined;

export const numStr = (n: number): string => (Number.isInteger(n) ? String(n) : String(n));

// ── Block-Helfer ─────────────────────────────────────────────────────────────

export function directProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'property') out.set(e.property.key, e.property.value);
  return out;
}

/** Properties from a block's local `style {}` sub-block (§9.1 override layer). */
export function styleSubBlockProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'style') for (const p of e.style.properties) out.set(p.key, p.value);
  return out;
}

/** Properties from a block's local `layout {}` sub-block only (no Layout-ref). */
export function localLayoutProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'layout') for (const p of e.layout.properties) out.set(p.key, p.value);
  return out;
}

export const childBlocks = (block: SflBlock): SflBlock[] =>
  block.entries.filter(e => e.type === 'block').map(e => (e as any).block as SflBlock);

/** Classifies a block's composition-list refs by target-block kind (§9). */
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

/**
 * A `: Foo` composition ref that matches neither map degrades completely
 * silently everywhere else in this file (classifyRefs just drops it, and
 * every caller downstream — mergedProps, layoutProp, resolveStyle,
 * resolveLayout — falls through to "nothing referenced" with no error path
 * at all). The most common real cause: a `Style`/`Layout` block declared
 * INSIDE `Model` instead of at the top level alongside it, so it never made
 * it into styleBlocks/layoutBlocks in the first place — every entity that
 * references it then silently gets no shape and no fill/stroke (renders as
 * an invisible box, only its text showing).
 *
 * One dedicated pass over the whole tree, rather than checking inline from
 * classifyRefs' many call sites, so each unresolved ref is reported exactly
 * once per block that uses it, not once per place that happens to resolve it.
 */
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
