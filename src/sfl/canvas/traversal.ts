import type { SflBlock } from '../ast';
import { buildEntity } from './entityReader';
import type { CanvasResolution } from './resolution';
import type { SflEntityOut, SflGroupOut } from './types';
import { asNumber, asString, childBlocks, directProps, tupleVals } from './readers';

export interface CanvasTree {
  entities: SflEntityOut[];
  groups: SflGroupOut[];
  linkBlocks: SflBlock[];
}

export function readCanvasTree(model: SflBlock | undefined, resolution: CanvasResolution): CanvasTree {
  const { entityReaderContext } = resolution;
  const { mergedProps, layoutProp } = entityReaderContext;
  const entities: SflEntityOut[] = [];
  const linkBlocks: SflBlock[] = [];
  const groups: SflGroupOut[] = [];
  
  // Direkte Entity-/Container-Mitglieder eines Group- oder gruppenartigen
  // Container-Blocks (Subgroups sammeln ihre eigenen Mitglieder selbst).
  const directMemberIds = (block: SflBlock): string[] =>
    childBlocks(block)
      .filter(b => b.kind === 'Entity' || b.kind === 'Container' || b.kind === 'Table' || b.kind === 'Path' || b.kind === 'Chart')
      .map(b => asString(directProps(b).get('id')) ?? b.name);
  
  // rekursiver Walk: Container (Frame/Swimlane/…, immer mit eigener Position/
  // Größe, §12.1) → eigene visuelle Entity, absteigen mit Entity-Ursprung +
  // frame_id. Group (rein semantisch bzgl. Geometrie, §11: nie eigenes
  // layout{}/Layout-Ref, darf aber Style tragen) → KEINE eigene Entity,
  // transparent für Koordinaten (Kinder bekommen denselben `origin`
  // durchgereicht), nur Name+Style+Mitgliedschaft werden gesammelt.
  const walk = (block: SflBlock, origin: { x: number; y: number }, frameId: string | undefined): SflGroupOut[] => {
    // SFL 1.4 `flow`/`gap` (§12.1, Container-only): auto-positions this
    // block's own DIRECT Container/positioned-leaf children along one axis,
    // a running cursor generalizing what buildSwimlane's lane-offset loop
    // already does for lane bands specifically. Absent/unrecognized `flow`
    // (Model/Group never set it — Groups are geometry-transparent by spec,
    // §11 — and a plain Container without it) means nextFlowPos always
    // returns undefined, i.e. today's fully unchanged explicit-position
    // behavior. A child's own `layout.position` is ignored when this
    // resolves to a real position; `layout.size` stays required/explicit.
    const flowAxis = asString(layoutProp(block, 'flow'));
    const flowGap = asNumber(layoutProp(block, 'gap')) ?? 0;
    let flowCursor = 0;
    const nextFlowPos = (childSize: number[]): number[] | undefined => {
      if (flowAxis !== 'horizontal' && flowAxis !== 'vertical') return undefined;
      const pos = flowAxis === 'horizontal' ? [flowCursor, 0] : [0, flowCursor];
      flowCursor += (flowAxis === 'horizontal' ? childSize[0] : childSize[1]) + flowGap;
      return pos;
    };
  
    const localGroups: SflGroupOut[] = [];
    for (const child of childBlocks(block)) {
      if (child.kind === 'Container') {
        const childSize = tupleVals(layoutProp(child, 'size')) ?? [0, 0];
        const ent = buildEntity(child, origin, entityReaderContext, frameId, nextFlowPos(childSize));
        entities.push(ent);
        // Kinder relativ zur absoluten Container-Position; im Container gefundene
        // Groups wandern (flach) in die Ergebnisliste, mit parentFrameId = Container.
        localGroups.push(...walk(child, { x: ent.x, y: ent.y }, ent.id));
      } else if (child.kind === 'Entity' || child.kind === 'Table' || child.kind === 'Path' || child.kind === 'Chart') {
        // Table (§12.1a) is a positioned board member like Entity — never a
        // Container: it never holds further Entities/Groups/Links, so unlike
        // the Container branch above, it doesn't recurse into walk(). Its own
        // Columns/Rows are read separately inside buildEntity.
        const childSize = tupleVals(layoutProp(child, 'size')) ?? [0, 0];
        entities.push(buildEntity(child, origin, entityReaderContext, frameId, nextFlowPos(childSize)));
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
      } else if (child.kind === 'Net') {
        // §3.5 Net (Muster C): PARSE-seitig deterministisch in N-1 gewöhnliche
        // Links zerlegt (Sternschema: erstes Mitglied als Hub, alle anderen
        // Mitglieder verbinden sich dorthin) - keine eigene Net-Repräsentation
        // im Canvas-Modell, keine Rück-Emission (siehe ast.ts's BlockKind-
        // Kommentar zu 'Net' für die Begründung). Läuft danach exakt durch
        // dieselbe Endpoint-Auflösung wie ein echter Link-Block.
        const netProps = mergedProps(child);
        const membersValue = netProps.get('members');
        const members = membersValue?.type === 'list'
          ? membersValue.values.flatMap(v => v.type === 'ident' ? [v.segments] : [])
          : [];
        const netText = asString(netProps.get('text'));
        if (members.length >= 2) {
          const hub = members[0];
          for (let i = 1; i < members.length; i++) {
            const entries: SflBlock['entries'] = [
              { type: 'property', property: { key: 'from', value: { type: 'endpoint', segments: hub } } },
              { type: 'property', property: { key: 'to', value: { type: 'endpoint', segments: members[i] } } },
            ];
            if (netText) entries.push({ type: 'property', property: { key: 'text', value: { type: 'string', value: netText, multiline: false } } });
            linkBlocks.push({ kind: 'Link', name: `${child.name}_${i}`, composition: [], entries });
          }
        }
      }
    }
    return localGroups;
  };
  
  if (model) groups.push(...walk(model, { x: 0, y: 0 }, undefined));
  
  
  return { entities, groups, linkBlocks };
}

