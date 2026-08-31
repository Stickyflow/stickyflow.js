import type { SflBlock, SflDocument, SflValue } from '../ast';
import type { EntityReaderContext } from './entityReader';
import type { SflDiagnostic, SflEntityOut } from './types';
import { asNumber, childBlocks, classifyRefs, collectUnresolvedRefs, directProps, localLayoutProps, styleSubBlockProps, tupleVals } from './readers';

export interface CanvasResolution {
  model?: SflBlock;
  diagnostics: SflDiagnostic[];
  entityReaderContext: EntityReaderContext;
}

export function createCanvasResolution(doc: SflDocument): CanvasResolution {
  const styleBlocks = new Map<string, SflBlock>();
  const layoutBlocks = new Map<string, SflBlock>();
  // Freie Formen (§5.5): eigener Namensraum, referenziert als Wert von
  // `shape:` (nicht per `:`-Komposition wie Style/Layout).
  const symbolDefs = new Map<string, { name: string; points: Array<[number, number]>; tension?: number; ports?: Array<{ name: string; at: [number, number] }> }>();
  let model: SflBlock | undefined;
  for (const b of doc.blocks) {
    if (b.kind === 'Style') styleBlocks.set(b.name, b);
    else if (b.kind === 'Layout') layoutBlocks.set(b.name, b);
    else if (b.kind === 'Symbol') {
      const symbolProps = directProps(b);
      const pointsValue = symbolProps.get('points');
      const points = pointsValue?.type === 'list'
        ? pointsValue.values.flatMap(item => {
            if (item.type !== 'list' || item.values.length < 2) return [];
            const px = asNumber(item.values[0]);
            const py = asNumber(item.values[1]);
            return px === undefined || py === undefined ? [] : [[px, py] as [number, number]];
          })
        : [];
      // Benannte Anschlüsse (§3.5 Schematics): Port-Kindblöcke, normalisiert
      // wie points. Ein Port ohne gültiges `at:` (z.B. Rundtrip-Rauschen)
      // wird verworfen statt die ganze Symbol-Definition zu verwerfen.
      const ports = childBlocks(b)
        .filter(child => child.kind === 'Port')
        .flatMap(portBlock => {
          const at = tupleVals(directProps(portBlock).get('at'));
          const ax = typeof at?.[0] === 'number' ? at[0] : undefined;
          const ay = typeof at?.[1] === 'number' ? at[1] : undefined;
          return ax === undefined || ay === undefined ? [] : [{ name: portBlock.name, at: [ax, ay] as [number, number] }];
        });
      if (points.length >= 2) symbolDefs.set(b.name, { name: b.name, points, tension: asNumber(symbolProps.get('tension')), ports: ports.length ? ports : undefined });
    }
    else if (b.kind === 'Model' && !model) model = b;
    else if (b.kind === 'Project') {
      for (const inner of childBlocks(b)) if (inner.kind === 'Model' && !model) model = inner;
    }
  }
  const diagnostics = collectUnresolvedRefs(doc, styleBlocks, layoutBlocks);
  
  const resolvedStyles = new Map<string, Map<string, SflValue>>();
  const resolveStyle = (name: string, seen: Set<string> = new Set()): Map<string, SflValue> => {
    const cached = resolvedStyles.get(name);
    if (cached) return cached;
    const blk = styleBlocks.get(name);
    if (!blk || seen.has(name)) return new Map();
    const merged = new Map<string, SflValue>();
    const { styleRef } = classifyRefs(blk.composition, styleBlocks, layoutBlocks);
    if (styleRef) for (const [k, v] of resolveStyle(styleRef, new Set([...seen, name]))) merged.set(k, v);
    for (const [k, v] of directProps(blk)) merged.set(k, v);
    resolvedStyles.set(name, merged);
    return merged;
  };
  for (const name of styleBlocks.keys()) resolveStyle(name);
  
  const resolvedLayouts = new Map<string, Map<string, SflValue>>();
  const resolveLayout = (name: string, seen: Set<string> = new Set()): Map<string, SflValue> => {
    const cached = resolvedLayouts.get(name);
    if (cached) return cached;
    const blk = layoutBlocks.get(name);
    if (!blk || seen.has(name)) return new Map();
    const merged = new Map<string, SflValue>();
    const { layoutRef } = classifyRefs(blk.composition, styleBlocks, layoutBlocks);
    if (layoutRef) for (const [k, v] of resolveLayout(layoutRef, new Set([...seen, name]))) merged.set(k, v);
    for (const [k, v] of directProps(blk)) merged.set(k, v);
    resolvedLayouts.set(name, merged);
    return merged;
  };
  for (const name of layoutBlocks.keys()) resolveLayout(name);
  
  // Merge-Reihenfolge (§9.1): referenzierter Style → direkte Top-Level-Props
  // → lokaler style {} Override zuletzt (gewinnt).
  const mergedProps = (block: SflBlock): Map<string, SflValue> => {
    const merged = new Map<string, SflValue>();
    const { styleRef } = classifyRefs(block.composition, styleBlocks, layoutBlocks);
    if (styleRef && resolvedStyles.has(styleRef)) {
      for (const [k, v] of resolvedStyles.get(styleRef)!) merged.set(k, v);
    }
    for (const [k, v] of directProps(block)) merged.set(k, v);
    for (const [k, v] of styleSubBlockProps(block)) merged.set(k, v);
    return merged;
  };
  
  // Merge-Reihenfolge für Geometrie: referenzierter Layout-Block → lokaler
  // layout {} Override zuletzt (gewinnt) — spiegelt die Style-Präzedenz.
  const layoutProp = (block: SflBlock, key: string): SflValue | undefined => {
    const local = localLayoutProps(block);
    if (local.has(key)) return local.get(key);
    const { layoutRef } = classifyRefs(block.composition, styleBlocks, layoutBlocks);
    return layoutRef ? resolvedLayouts.get(layoutRef)?.get(key) : undefined;
  };
  

  return {
    model,
    diagnostics,
    entityReaderContext: { mergedProps, layoutProp, symbolDefs },
  };
}

