// src/features/sfl-language/sfl/sflToCanvasState.ts
//
// Kehrseite von canvasStateToSfl: SFL-1.2-Text → App-nahes Canvas-Modell. Das ist
// das FEHLENDE Bein des Round-Trips (Board → SFL → Board) und damit die
// Existenzberechtigung des Formats: nur wenn diese Rückrichtung strukturell
// verlustfrei UND diff-stabil ist, ist SFL ein Canvas-Format und keine bloße
// Diagramm-Sprache.
//
// Reine Funktion (kein React, keine Seiteneffekte). Sie macht die drei
// Emit-Transformationen rückgängig:
//   • Styles (§9, inkl. Vererbung) → präsentationale Props zurück ans Element.
//   • Relative Positionen (§6.2) → wieder absolut (Frame-/Group-Ursprung addiert).
//   • Verschachtelung → parentFrameId + Group-Zugehörigkeit; Links per Name → id.
//
// Bewusst NICHT enthalten: das Dekodieren von Style-STRINGS zurück in Objekte
// (gradient(...)/mesh(...)/shadow(...) bleiben Strings). Das ist ein späterer
// Schritt; für die strukturelle Round-Trip-Treue genügen die Strings verbatim.

import { parse } from './parser';
import type {
  SflDocument, SflBlock, SflProperty, SflValue, Side,
} from './ast';

export interface SflEntityOut {
  id: string;
  entityType: 'shape' | 'frame' | 'swimlane' | 'table';
  kind: string;
  text?: string;
  shapeType?: string;
  x: number; y: number; width: number; height: number;
  rotation?: number;
  order?: number;
  parentFrameId?: string;
  // präsentationale Props als Strings (verbatim aus dem SFL / gemergten Style)
  props: Record<string, string>;
  table?: {
    columns: Array<{ id: string; label: string; width: number; type: 'text' | 'boolean' }>;
    rows: Array<{ id: string; cells: Record<string, string | boolean> }>;
  };
}

export interface SflLinkOut {
  id: string;
  fromId?: string;
  toId?: string;
  text?: string;
  fromSide?: Side; fromFraction?: number;
  toSide?: Side; toFraction?: number;
  props: Record<string, string>;
}

export interface SflGroupOut {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  entityIds: string[];
  subGroups: SflGroupOut[];
  parentFrameId?: string;
}

export interface SflCanvasState {
  entities: SflEntityOut[];
  links: SflLinkOut[];
  groups: SflGroupOut[];
}

// ── Wert-Helfer ──────────────────────────────────────────────────────────────

const asString = (v?: SflValue): string | undefined => {
  if (!v) return undefined;
  if (v.type === 'string') return v.value;
  if (v.type === 'ident') return v.segments.join('.');
  if (v.type === 'number') return numStr(v.value);
  return undefined;
};

const asNumber = (v?: SflValue): number | undefined =>
  v && v.type === 'number' ? v.value : undefined;

const tupleVals = (v?: SflValue): number[] | undefined =>
  v && v.type === 'tuple' ? v.values : undefined;

const numStr = (n: number): string => (Number.isInteger(n) ? String(n) : String(n));

// ── Block-Helfer ─────────────────────────────────────────────────────────────

function directProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'property') out.set(e.property.key, e.property.value);
  return out;
}

/** Properties from a block's local `style {}` sub-block (§9.1 override layer). */
function styleSubBlockProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'style') for (const p of e.style.properties) out.set(p.key, p.value);
  return out;
}

/** Properties from a block's local `layout {}` sub-block only (no Layout-ref). */
function localLayoutProps(block: SflBlock): Map<string, SflValue> {
  const out = new Map<string, SflValue>();
  for (const e of block.entries) if (e.type === 'layout') for (const p of e.layout.properties) out.set(p.key, p.value);
  return out;
}

const childBlocks = (block: SflBlock): SflBlock[] =>
  block.entries.filter(e => e.type === 'block').map(e => (e as any).block as SflBlock);

/** Classifies a block's composition-list refs by target-block kind (§9). */
function classifyRefs(
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

// ── Hauptfunktion ────────────────────────────────────────────────────────────

export function sflToCanvasState(sflText: string): SflCanvasState {
  const doc: SflDocument = parse(sflText);

  // 1) Styles + Layouts sammeln + Vererbungsketten auflösen (Eltern zuerst,
  //    Kind gewinnt). Beide Referenz-Achsen sind unabhängig (§9), teilen aber
  //    denselben flachen Single-Parent-Mechanismus.
  const styleBlocks = new Map<string, SflBlock>();
  const layoutBlocks = new Map<string, SflBlock>();
  let model: SflBlock | undefined;
  for (const b of doc.blocks) {
    if (b.kind === 'Style') styleBlocks.set(b.name, b);
    else if (b.kind === 'Layout') layoutBlocks.set(b.name, b);
    else if (b.kind === 'Model' && !model) model = b;
    else if (b.kind === 'Project') {
      for (const inner of childBlocks(b)) if (inner.kind === 'Model' && !model) model = inner;
    }
  }
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

  const entities: SflEntityOut[] = [];
  const linkBlocks: SflBlock[] = [];
  const groups: SflGroupOut[] = [];

  const entityTypeOf = (kind: string): SflEntityOut['entityType'] => {
    if (kind === 'frame') return 'frame';
    if (kind === 'swimlane') return 'swimlane';
    if (kind === 'table') return 'table';
    return 'shape';
  };

  // Legacy-Entity-Kind aus der Text-Ära; alte .sfl-Dokumente mit kind: note
  // werden beim Import still verworfen (keine Entity, kein Diagnostic).
  const buildEntity = (block: SflBlock, origin: { x: number; y: number }, frameId?: string): SflEntityOut | null => {
    const p = mergedProps(block);
    const pos = tupleVals(layoutProp(block, 'position')) ?? [0, 0];
    const size = tupleVals(layoutProp(block, 'size')) ?? [0, 0];
    const kind = asString(p.get('kind')) ?? '';
    if (kind === 'note') return null;
    const shapeType = asString(p.get('shape'));

    // präsentationale Props (alles außer den strukturellen Schlüsseln) als Strings
    const structural = new Set(['id', 'kind', 'text', 'shape', 'parent', 'order']);
    const props: Record<string, string> = {};
    let tableData: SflEntityOut['table'];
    for (const [k, v] of p) {
      if (structural.has(k)) continue;
      const s = asString(v);
      if (s !== undefined) props[k] = s;
    }
    if (kind === 'table') {
      const columnsBlock = childBlocks(block).find(child => child.kind === 'Columns');
      const rowsBlock = childBlocks(block).find(child => child.kind === 'Rows');
      if (columnsBlock) {
        const columns: NonNullable<SflEntityOut['table']>['columns'] = childBlocks(columnsBlock).filter(child => child.kind === 'Column').map(column => {
          const columnProps = directProps(column);
          return {
            id: column.name,
            label: asString(columnProps.get('text')) ?? column.name,
            width: asNumber(localLayoutProps(column).get('width')) ?? 120,
            type: asString(columnProps.get('cellType')) === 'boolean' ? 'boolean' : 'text',
          };
        });
        const rows = rowsBlock
          ? childBlocks(rowsBlock).filter(child => child.kind === 'Row').map(row => {
              const cells: Record<string, string | boolean> = {};
              const rowProps = directProps(row);
              for (const column of columns) {
                const value = asString(rowProps.get(column.id));
                cells[column.id] = column.type === 'boolean' ? value === 'true' : (value ?? '');
              }
              return { id: row.name, cells };
            })
          : [];
        tableData = { columns, rows };
      }

      // SFL 1.2 compatibility: accept the old positional nested lists, but
      // the canonical emitter never writes them again.
      const columnsValue = p.get('columns');
      const rowsValue = p.get('rows');
      if (!columnsBlock && columnsValue?.type === 'list') {
        const columns: NonNullable<SflEntityOut['table']>['columns'] = columnsValue.values.flatMap((value, index) => {
          if (value.type !== 'list') return [];
          const label = asString(value.values[0]);
          const width = asNumber(value.values[1]);
          const type = asString(value.values[2]);
          if (label === undefined || width === undefined) return [];
          return [{ id: `col-${index + 1}`, label, width, type: type === 'boolean' ? 'boolean' : 'text' }];
        });
        if (rowsValue?.type === 'list') {
          const rows = rowsValue.values.flatMap((value, rowIndex) => {
            if (value.type !== 'list') return [];
            const cells: Record<string, string | boolean> = {};
            columns.forEach((column, columnIndex) => {
              const cell = value.values[columnIndex];
              cells[column.id] = column.type === 'boolean' ? asString(cell) === 'true' : (asString(cell) ?? '');
            });
            return [{ id: `row-${rowIndex + 1}`, cells }];
          });
          tableData = { columns, rows };
        } else {
          tableData = { columns, rows: [] };
        }
      }
      const rowHeight = asNumber(layoutProp(block, 'rowHeight'));
      if (rowHeight !== undefined) props.rowHeight = numStr(rowHeight);
    }

    return {
      id: asString(p.get('id')) ?? block.name,
      entityType: entityTypeOf(kind),
      kind,
      text: asString(p.get('text')),
      shapeType,
      x: origin.x + (pos[0] ?? 0),
      y: origin.y + (pos[1] ?? 0),
      width: size[0] ?? 0,
      height: size[1] ?? 0,
      rotation: asNumber(layoutProp(block, 'rotation')),
      order: asNumber(layoutProp(block, 'order')),
      // strukturelle Zugehörigkeit bevorzugt aus Verschachtelung, sonst parent:-Ref
      parentFrameId: frameId ?? asString(p.get('parent')),
      props,
      table: tableData,
    };
  };

  // Direkte Entity-/Container-Mitglieder eines Group- oder gruppenartigen
  // Container-Blocks (Subgroups sammeln ihre eigenen Mitglieder selbst).
  const directMemberIds = (block: SflBlock): string[] =>
    childBlocks(block)
      .filter(b => b.kind === 'Entity' || b.kind === 'Container')
      .map(b => asString(directProps(b).get('id')) ?? b.name);

  // rekursiver Walk: Container (Frame/Swimlane/…, immer mit eigener Position/
  // Größe, §12.1) → eigene visuelle Entity, absteigen mit Entity-Ursprung +
  // frame_id. Group (rein semantisch bzgl. Geometrie, §11: nie eigenes
  // layout{}/Layout-Ref, darf aber Style tragen) → KEINE eigene Entity,
  // transparent für Koordinaten (Kinder bekommen denselben `origin`
  // durchgereicht), nur Name+Style+Mitgliedschaft werden gesammelt.
  const walk = (block: SflBlock, origin: { x: number; y: number }, frameId: string | undefined): SflGroupOut[] => {
    const localGroups: SflGroupOut[] = [];
    for (const child of childBlocks(block)) {
      if (child.kind === 'Container') {
        const ent = buildEntity(child, origin, frameId);
        if (!ent) continue; // Container ist nie kind: note, aber buildEntity bleibt defensiv nullable
        entities.push(ent);
        // Kinder relativ zur absoluten Container-Position; im Container gefundene
        // Groups wandern (flach) in die Ergebnisliste, mit parentFrameId = Container.
        localGroups.push(...walk(child, { x: ent.x, y: ent.y }, ent.id));
      } else if (child.kind === 'Entity') {
        const ent = buildEntity(child, origin, frameId);
        if (ent) entities.push(ent);
      } else if (child.kind === 'Group') {
        const p = mergedProps(child); // Style-Referenz + lokales style{} erlaubt (§11)
        const subGroups = walk(child, origin, frameId); // transparent: kein eigener Ursprung
        localGroups.push({
          id: asString(p.get('id')) ?? child.name,
          name: asString(p.get('text')) ?? child.name,
          color: asString(p.get('color')),
          icon: asString(p.get('icon')),
          entityIds: directMemberIds(child),
          subGroups,
          parentFrameId: frameId ?? asString(p.get('parent')),
        });
      } else if (child.kind === 'Link') {
        linkBlocks.push(child);
      }
    }
    return localGroups;
  };

  if (model) groups.push(...walk(model, { x: 0, y: 0 }, undefined));

  // 2) Links: Name → id (Namen sind global eindeutig; die id-Property trägt die
  //    UUID). Rekursiv über alle Entity/Container-Blöcke indizieren.
  const idByName = new Map<string, string>();
  const indexNames = (blocks: SflBlock[]) => {
    for (const b of blocks) {
      if (b.kind === 'Entity' || b.kind === 'Container') {
        idByName.set(b.name, asString(directProps(b).get('id')) ?? b.name);
      }
      indexNames(childBlocks(b));
    }
  };
  if (model) indexNames(childBlocks(model));

  const links: SflLinkOut[] = linkBlocks.map(lb => {
    const p = mergedProps(lb);
    const fromV = p.get('from');
    const toV = p.get('to');
    const endpoint = (v?: SflValue): { id?: string; side?: Side; fraction?: number } => {
      if (!v || v.type !== 'endpoint') return {};
      const last = v.segments[v.segments.length - 1];
      return { id: idByName.get(last) ?? last, side: v.side, fraction: v.fraction };
    };
    const f = endpoint(fromV);
    const t = endpoint(toV);
    const structural = new Set(['id', 'from', 'to', 'text']);
    const props: Record<string, string> = {};
    for (const [k, v] of p) {
      if (structural.has(k)) continue;
      const s = asString(v);
      if (s !== undefined) props[k] = s;
    }
    return {
      id: asString(p.get('id')) ?? lb.name,
      fromId: f.id, toId: t.id,
      text: asString(p.get('text')),
      fromSide: f.side, fromFraction: f.fraction,
      toSide: t.side, toFraction: t.fraction,
      props,
    };
  });

  return { entities, links, groups };
}
