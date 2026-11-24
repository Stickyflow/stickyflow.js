import type { SflBlock, SflDocument, SflValue } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

const blocksIn = (block: SflBlock): SflBlock[] => [block, ...childBlocks(block).flatMap(blocksIn)];

const nameOf = (value: SflValue | undefined): string | undefined =>
  value?.type === 'ident' && value.segments.length === 1 ? value.segments[0] : undefined;

// The blocks whose `symbol` names an outline, as a chart series names a marker by the same word.
const OUTLINED = new Set(['Solid', 'Cut', 'Add', 'Keep', 'Isometric', 'Shape', 'Entity']);
const BODIES = new Set(['Mesh', 'Solid', 'Facets', 'Terrain']);

// A name that points at no block would fall back without a word: a Solid without its Sketch to a cube, an outline to a square,
// a label to the middle of the stage. It is said instead.
export function collectUnknownReferences(doc: SflDocument): SflDiagnostic[] {
  const all = doc.blocks.flatMap(blocksIn);
  const named = (kinds: ReadonlySet<string> | string) =>
    new Set(
      all
        .filter(block => (typeof kinds === 'string' ? block.kind === kinds : kinds.has(block.kind)))
        .map(block => block.name),
    );
  const known = {
    sketch: named('Sketch'),
    symbol: named('Symbol'),
    loft: named('Symbol'),
    anchor: named(BODIES),
    picture: named('Canvas'),
  };
  const what = { sketch: 'Sketch', symbol: 'Symbol', loft: 'Symbol', anchor: 'body', picture: 'Canvas' } as const;
  // A Shape drawn as a Symbol names it in symbol now; in shape it is still drawn.
  const shapeAsSymbol = all.flatMap(block => {
    const name = nameOf(directProperties(block).get('shape'));
    return (block.kind === 'Shape' || block.kind === 'Entity') && name !== undefined && known.symbol.has(name)
      ? [
          {
            severity: 'warning' as const,
            code: 'shape-names-symbol',
            ownerId: block.name,
            message: `${block.kind} '${block.name}' names the Symbol '${name}' in shape. It is drawn, but is written symbol: ${name} now; shape names a form that is built in.`,
          },
        ]
      : [];
  });
  return shapeAsSymbol.concat(
    all.flatMap(block => {
      const properties = directProperties(block);
      return (Object.keys(known) as (keyof typeof known)[]).flatMap(key => {
        if ((key === 'symbol' || key === 'loft') && !OUTLINED.has(block.kind)) {
          return [];
        }
        const name = nameOf(properties.get(key));
        if (name === undefined || known[key].has(name)) {
          return [];
        }
        return [
          {
            severity: 'warning' as const,
            code: 'unknown-reference',
            ownerId: block.name,
            message: `${block.kind} '${block.name}' names the ${what[key]} '${name}' in ${key}, and there is none of that name.`,
          },
        ];
      });
    }),
  );
}
