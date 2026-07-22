// src/features/sfl-language/sfl/emitter.ts
//
// ─── Wozu dient der Emitter? (Stufe 3 von 4) ────────────────────────────────
// Der Emitter ist die Gegenrichtung zum Parser: Er nimmt den AST (den Baum) und
// schreibt ihn zurück in SFL-Text. Also "Struktur → Text" statt "Text → Struktur".
//
// Der Clou ist das Wort KANONISCH: Es gibt genau EINE erlaubte Textform pro
// Modell. Egal wie das ursprüngliche SFL formatiert war (andere Reihenfolge,
// andere Einrückung) — der Emitter bringt es immer in dieselbe normierte Gestalt:
// feste Property-Reihenfolge, zwei Leerzeichen Einrückung, Zahlen ohne unnötige
// Nullen, genau eine Leerzeile zwischen Blöcken.
//
// Warum braucht man das? Zwei Gründe, beide zentral für KI-Editing:
//   1. Kleine, review-bare Diffs. Wenn die KI nur eine Position ändert, ändert
//      sich auch nur diese eine Zeile im Text — nicht die halbe Datei durch
//      zufällige Umformatierung. Das macht SFL git-tauglich.
//   2. Verlustfreiheit beweisbar. Ein Re-Emit von bereits kanonischem Text
//      erzeugt KEINEN Diff (Idempotenz). Genau das prüfen die Round-Trip-Tests —
//      es ist NICHT Textgleichheit mit dem handgeschriebenen §18-Beispiel, denn
//      §15.3 ordnet Properties bewusst um; ein handgeschriebenes Dokument ist
//      also nicht automatisch schon kanonisch.
//
// In unserem System läuft der Emitter, wann immer wir Canvas → SFL für die KI
// serialisieren, oder eine KI-Änderung als sauberen Text zurückschreiben.
//
// Reihenfolge innerhalb eines Blocks (§15.3):
//   1. id   2. kind   3. text
//   4. übrige Properties (alphabetisch) — presentational Werte leben inzwischen
//      in style{}/Style, nicht mehr in einer eigenen Top-Level-Tier
//   5. verschachtelte Blöcke (Entity/Group/Link) in Dokumentreihenfolge, dabei
//      Layout-Referenzblöcke vor Style-Referenzblöcken im selben Scope (§15.4)
//      — Leerzeile davor, da eigenständige Geschwister-Blöcke
//   6. layout {} 7. style {} — direkt angehängt, KEINE Leerzeile davor: sie
//      lesen sich als nachgestellte Metadaten dieses Blocks, nicht als
//      gleichwertige Geschwister
// Unbekannte Properties sortieren nach den bekannten, alphabetisch (§16).
// Innerhalb eines Style-Blocks bzw. eines lokalen style{} gilt eine feste
// Reihenfolge von struktureller zu detaillierter Erscheinung (§15.6), analog
// zu LAYOUT_ORDER für layout{}/Layout.
// Komposition (`: Style & Layout`, §8): kanonisch Style-Referenz vor
// Layout-Referenz (§15.5), unabhängig von der Autoren-Reihenfolge.

import type {
  SflDocument, SflBlock, SflProperty, SflLayout, SflStyle, SflValue, BlockKind,
} from './ast';

const INDENT = '  '; // two spaces per level (§15.1)

// Canonical order of layout properties (§15.4); unknown layout fields follow,
// alphabetically (§16). Applies both to a `layout {}` sub-block and to a
// reusable `Layout` block's own properties.
const LAYOUT_ORDER = ['position', 'size', 'rotation', 'order'];

// Canonical order of style properties (§15.6): structural appearance to
// detailed appearance. Applies both to a `style {}` sub-block and to a
// reusable `Style` block's own properties.
const STYLE_ORDER = [
  'shape', 'fill', 'stroke', 'strokeWidth', 'strokeStyle', 'textColor', 'color',
  'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'verticalAlign',
  'cornerRadius', 'dash', 'shadow', 'opacity', 'icon', 'route', 'marker',
  'markerStart', 'markerEnd', 'asset',
];

export function emit(doc: SflDocument): string {
  const kindOf = buildKindIndex(doc);
  const body = joinSiblingBlocks(doc.blocks, 0, kindOf);
  const out = body ? `sfl ${doc.version}\n\n${body}` : `sfl ${doc.version}`;
  // Trailing whitespace stripped; file ends with exactly one newline (§15.8).
  return out.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n') + '\n';
}

// Document-wide name → kind index, used to classify composition-list refs as
// Style vs. Layout for canonical ordering (§15.5). Built once per emit() call.
function buildKindIndex(doc: SflDocument): Map<string, BlockKind> {
  const map = new Map<string, BlockKind>();
  const walk = (blocks: SflBlock[]) => {
    for (const b of blocks) {
      if (!map.has(b.name)) map.set(b.name, b.kind);
      walk(b.entries.filter(e => e.type === 'block').map(e => (e as any).block as SflBlock));
    }
  };
  walk(doc.blocks);
  return map;
}

// §15.4/§15.7 (Verfeinerung): reusable Layout-Definitionen werden ohne
// Leerzeile untereinander gestapelt, ebenso reusable Style-Definitionen —
// jede nichtleere Gruppe bekommt eine synthetische Abschnitts-Kopfzeile
// (`// Layout Definition` / `// Style Definition`). Alles andere (Entity/
// Group/Container/Link/Model/…) behält die normale Leerzeile zwischen
// Geschwister-Blöcken. Die Kopfzeilen sind reine Emitter-Deko, kein AST-Feld
// (Kommentare werden beim Parsen verworfen, §4.2) — sie werden bei jedem
// emit() neu aus der Blockart-Verteilung abgeleitet, daher bleibt
// canonicalize() idempotent.
function joinSiblingBlocks(blocks: SflBlock[], depth: number, kindOf: Map<string, BlockKind>): string {
  const pad = INDENT.repeat(depth);
  const layouts = blocks.filter(b => b.kind === 'Layout');
  const styles = blocks.filter(b => b.kind === 'Style');
  const others = blocks.filter(b => b.kind !== 'Layout' && b.kind !== 'Style');

  const groups: string[] = [];
  if (layouts.length) {
    groups.push(`${pad}// Layout Definition\n${layouts.map(b => emitBlock(b, depth, kindOf)).join('\n')}`);
  }
  if (styles.length) {
    groups.push(`${pad}// Style Definition\n${styles.map(b => emitBlock(b, depth, kindOf)).join('\n')}`);
  }
  for (const o of others) groups.push(emitBlock(o, depth, kindOf));

  return groups.join('\n\n');
}

// §15.5: composition-list refs canonicalize to Style-ref(s) first, then
// Layout-ref(s), then anything unresolved (defensive passthrough).
function emitComposition(composition: string[], kindOf: Map<string, BlockKind>): string {
  if (composition.length === 0) return '';
  const styleRefs = composition.filter(r => kindOf.get(r) === 'Style');
  const layoutRefs = composition.filter(r => kindOf.get(r) === 'Layout');
  const other = composition.filter(r => kindOf.get(r) !== 'Style' && kindOf.get(r) !== 'Layout');
  return ` : ${[...styleRefs, ...layoutRefs, ...other].join(' & ')}`;
}

// §14.7: a reusable Layout/Style *definition* with few properties collapses to
// one compact line (`Style Name { a: 1; b: 2 }`) instead of one property per
// line. Local `layout {}`/`style {}` sub-blocks never use this compact form —
// only the top-level reusable block kinds do. The threshold is deliberately a
// small, fixed property count ("kurz") rather than a line-width heuristic, so
// the rule stays deterministic and idempotent.
const COMPACT_MAX_PROPS = 3;

function emitBlock(block: SflBlock, depth: number, kindOf: Map<string, BlockKind>): string {
  const pad = INDENT.repeat(depth);
  const header = `${block.kind} ${block.name}${emitComposition(block.composition, kindOf)} {`;

  const properties = block.entries.filter(e => e.type === 'property').map(e => (e as any).property as SflProperty);
  const nestedBlocks = block.entries.filter(e => e.type === 'block').map(e => (e as any).block as SflBlock);
  const layoutEntry = block.entries.find(e => e.type === 'layout') as { type: 'layout'; layout: SflLayout } | undefined;
  const styleEntry = block.entries.find(e => e.type === 'style') as { type: 'style'; style: SflStyle } | undefined;

  // A reusable Layout/Style block only ever holds properties (§5, Tabelle 4)
  // and orders them like layout{}/style{}, not id/kind/text/alpha.
  const propComparator = block.kind === 'Layout' ? compareLayoutProps
    : block.kind === 'Style' ? compareStyleProps
    : compareProps;
  const sortedProps = [...properties].sort((a, b) => propComparator(a.key, b.key));

  const isCompactDefinition = (block.kind === 'Layout' || block.kind === 'Style')
    && !nestedBlocks.length && !layoutEntry && !styleEntry
    && sortedProps.length <= COMPACT_MAX_PROPS;
  if (isCompactDefinition) {
    const body = sortedProps.map(emitProperty).join('; ');
    return body ? `${pad}${header} ${body} }` : `${pad}${header} }`;
  }

  const innerPad = INDENT.repeat(depth + 1);
  const propLines = sortedProps.map(p => `${innerPad}${emitProperty(p)}`);

  // Properties, then (blank line) nested blocks — Layout/Style grouped+
  // headered, others one-blank-line-separated, §15.4/§15.7 — then `layout {}`
  // and `style {}` attach directly (single newline, no blank line): they read
  // as trailing metadata of THIS block, not as siblings of equal weight.
  let inner = propLines.join('\n');
  if (nestedBlocks.length) {
    const nestedStr = joinSiblingBlocks(nestedBlocks, depth + 1, kindOf);
    inner = inner ? `${inner}\n\n${nestedStr}` : nestedStr;
  }
  if (layoutEntry) {
    const layoutStr = emitLayout(layoutEntry.layout, depth + 1);
    inner = inner ? `${inner}\n${layoutStr}` : layoutStr;
  }
  if (styleEntry) {
    const styleStr = emitStyle(styleEntry.style, depth + 1);
    inner = inner ? `${inner}\n${styleStr}` : styleStr;
  }

  return inner
    ? `${pad}${header}\n${inner}\n${pad}}`
    : `${pad}${header}\n${pad}}`;
}

function emitLayout(layout: SflLayout, depth: number): string {
  const pad = INDENT.repeat(depth);
  const innerPad = INDENT.repeat(depth + 1);
  const sorted = [...layout.properties].sort((a, b) => compareLayoutProps(a.key, b.key));
  const lines = sorted.map(p => `${innerPad}${emitProperty(p)}`);
  return lines.length
    ? `${pad}layout {\n${lines.join('\n')}\n${pad}}`
    : `${pad}layout {\n${pad}}`;
}

function emitStyle(style: SflStyle, depth: number): string {
  const pad = INDENT.repeat(depth);
  const innerPad = INDENT.repeat(depth + 1);
  const sorted = [...style.properties].sort((a, b) => compareStyleProps(a.key, b.key));
  const lines = sorted.map(p => `${innerPad}${emitProperty(p)}`);
  return lines.length
    ? `${pad}style {\n${lines.join('\n')}\n${pad}}`
    : `${pad}style {\n${pad}}`;
}

function emitProperty(p: SflProperty): string {
  return `${p.key}: ${emitValue(p.value)}`;
}

function emitValue(v: SflValue): string {
  switch (v.type) {
    case 'string': return emitString(v.value);
    case 'number': return formatNumber(v.value);
    case 'tuple': return v.values.map(formatNumber).join(', ');
    case 'list': return `[${v.values.map(emitValue).join(', ')}]`;
    case 'ident': return v.segments.join('.');
    case 'endpoint': {
      let s = v.segments.join('.');
      if (v.side) {
        s += `, ${v.side}`;
        if (v.fraction !== undefined) s += ` (${formatNumber(v.fraction)})`;
      }
      return s;
    }
  }
}

// §15.6: Strings immer einzeilig in doppelten Anführungszeichen. Zeilenumbrüche
// werden als `\n` kodiert — kein `"""`-Block beim Schreiben (besser lesbar für die
// meist kurzen Canvas-Labels). Der Parser akzeptiert `"""` weiterhin; die
// kanonische Form normalisiert es zu inline `\n`.
function emitString(value: string): string {
  const escaped = value
    .replace(/\r\n?/g, '\n')   // CRLF/CR → LF, bevor \n escaped wird
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

// §15.5: no superfluous zeros (80 not 80.0); decimal point only when needed.
function formatNumber(value: number): string {
  if (Object.is(value, -0)) return '0';
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

// Property sort key within a block (§15.3 + §16). Presentational values now
// live in style{}/Style rather than as a loose top-level tier, but a stray
// presentational-named top-level property (round-trip of unknown/legacy
// data) still sorts fine here — alphabetically among "everything else".
function propRank(key: string): number {
  if (key === 'id') return 0;
  if (key === 'kind') return 1;
  if (key === 'text') return 2;
  return 3;
}

function compareProps(a: string, b: string): number {
  const ra = propRank(a), rb = propRank(b);
  if (ra !== rb) return ra - rb;
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareLayoutProps(a: string, b: string): number {
  const ia = LAYOUT_ORDER.indexOf(a);
  const ib = LAYOUT_ORDER.indexOf(b);
  const ra = ia === -1 ? LAYOUT_ORDER.length : ia;
  const rb = ib === -1 ? LAYOUT_ORDER.length : ib;
  if (ra !== rb) return ra - rb;
  return a < b ? -1 : a > b ? 1 : 0; // unknown layout fields alphabetical (§16)
}

function compareStyleProps(a: string, b: string): number {
  const ia = STYLE_ORDER.indexOf(a);
  const ib = STYLE_ORDER.indexOf(b);
  const ra = ia === -1 ? STYLE_ORDER.length : ia;
  const rb = ib === -1 ? STYLE_ORDER.length : ib;
  if (ra !== rb) return ra - rb;
  return a < b ? -1 : a > b ? 1 : 0; // unknown style fields alphabetical (§16)
}
