import type { SflBlock, SflDocument, SflValue } from '../ast';
import type { EntityReaderContext } from './entityReader';
import {
  asNumber,
  childBlocks,
  classifyRefs,
  collectUnresolvedRefs,
  directProps,
  localLayoutProps,
  styleSubBlockProps,
  tupleVals,
} from './readers';
import type { SflDiagnostic, SflEntityOut } from './types';

type Definitions = Map<string, SflBlock>;
type ResolvedDefinitions = Map<string, Map<string, SflValue>>;

export interface CanvasResolution {
  model?: SflBlock;
  diagnostics: SflDiagnostic[];
  entityReaderContext: EntityReaderContext;
}

function readSymbol(block: SflBlock): NonNullable<SflEntityOut['symbol']> | undefined {
  const props = directProps(block);
  const value = props.get('points');
  const points =
    value?.type === 'list'
      ? value.values.flatMap(item => {
          if (item.type !== 'list' || item.values.length < 2) return [];
          const x = asNumber(item.values[0]);
          const y = asNumber(item.values[1]);
          return x === undefined || y === undefined ? [] : [[x, y] as [number, number]];
        })
      : [];
  if (points.length < 2) return undefined;

  const ports = childBlocks(block)
    .filter(child => child.kind === 'Port')
    .flatMap(port => {
      const at = tupleVals(directProps(port).get('at'));
      return typeof at?.[0] === 'number' && typeof at[1] === 'number'
        ? [{ name: port.name, at: [at[0], at[1]] as [number, number] }]
        : [];
    });
  return { name: block.name, points, tension: asNumber(props.get('tension')), ports: ports.length ? ports : undefined };
}

function collectDefinitions(doc: SflDocument) {
  const styles: Definitions = new Map();
  const layouts: Definitions = new Map();
  const symbols: EntityReaderContext['symbolDefs'] = new Map();
  let model: SflBlock | undefined;

  for (const block of doc.blocks) {
    if (block.kind === 'Style') styles.set(block.name, block);
    else if (block.kind === 'Layout') layouts.set(block.name, block);
    else if (block.kind === 'Symbol') {
      const symbol = readSymbol(block);
      if (symbol) symbols.set(block.name, symbol);
    } else if (block.kind === 'Model' && !model) model = block;
    else if (block.kind === 'Project' && !model) {
      model = childBlocks(block).find(child => child.kind === 'Model');
    }
  }
  return { styles, layouts, symbols, model };
}

function resolveDefinitions(
  definitions: Definitions,
  referencedName: (block: SflBlock) => string | undefined,
): ResolvedDefinitions {
  const resolved: ResolvedDefinitions = new Map();
  const resolve = (name: string, seen = new Set<string>()): Map<string, SflValue> => {
    const cached = resolved.get(name);
    if (cached) return cached;
    const block = definitions.get(name);
    if (!block || seen.has(name)) return new Map();

    const values = new Map<string, SflValue>();
    const parent = referencedName(block);
    if (parent) {
      for (const [key, value] of resolve(parent, new Set([...seen, name]))) values.set(key, value);
    }
    for (const [key, value] of directProps(block)) values.set(key, value);
    resolved.set(name, values);
    return values;
  };
  for (const name of definitions.keys()) resolve(name);
  return resolved;
}

export function createCanvasResolution(doc: SflDocument): CanvasResolution {
  const { styles, layouts, symbols, model } = collectDefinitions(doc);
  const refs = (block: SflBlock) => classifyRefs(block.composition, styles, layouts);
  const resolvedStyles = resolveDefinitions(styles, block => refs(block).styleRef);
  const resolvedLayouts = resolveDefinitions(layouts, block => refs(block).layoutRef);

  const mergedProps = (block: SflBlock): Map<string, SflValue> => {
    const merged = new Map(resolvedStyles.get(refs(block).styleRef ?? '') ?? []);
    for (const [key, value] of directProps(block)) merged.set(key, value);
    for (const [key, value] of styleSubBlockProps(block)) merged.set(key, value);
    return merged;
  };
  const layoutProp = (block: SflBlock, key: string): SflValue | undefined => {
    const local = localLayoutProps(block);
    if (local.has(key)) return local.get(key);
    const reference = refs(block).layoutRef;
    return reference ? resolvedLayouts.get(reference)?.get(key) : undefined;
  };

  return {
    model,
    diagnostics: collectUnresolvedRefs(doc, styles, layouts),
    entityReaderContext: { mergedProps, layoutProp, symbolDefs: symbols },
  };
}
