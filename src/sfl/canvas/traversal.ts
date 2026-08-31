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

function directMemberIds(block: SflBlock): string[] {
  const entityKinds = new Set(['Entity', 'Container', 'Table', 'Path', 'Chart']);
  return childBlocks(block)
    .filter(child => entityKinds.has(child.kind))
    .map(child => asString(directProps(child).get('id')) ?? child.name);
}

function createFlowPositioner(block: SflBlock, resolution: CanvasResolution) {
  const { layoutProp } = resolution.entityReaderContext;
  const axis = asString(layoutProp(block, 'flow'));
  const gap = asNumber(layoutProp(block, 'gap')) ?? 0;
  let cursor = 0;

  return (size: number[]): number[] | undefined => {
    if (axis !== 'horizontal' && axis !== 'vertical') return undefined;
    const position = axis === 'horizontal' ? [cursor, 0] : [0, cursor];
    cursor += (axis === 'horizontal' ? size[0] : size[1]) + gap;
    return position;
  };
}

function expandNet(block: SflBlock, resolution: CanvasResolution): SflBlock[] {
  const props = resolution.entityReaderContext.mergedProps(block);
  const membersValue = props.get('members');
  const members = membersValue?.type === 'list'
    ? membersValue.values.flatMap(value => value.type === 'ident' ? [value.segments] : [])
    : [];
  if (members.length < 2) return [];

  const text = asString(props.get('text'));
  return members.slice(1).map((member, index) => {
    const entries: SflBlock['entries'] = [
      { type: 'property', property: { key: 'from', value: { type: 'endpoint', segments: members[0] } } },
      { type: 'property', property: { key: 'to', value: { type: 'endpoint', segments: member } } },
    ];
    if (text) entries.push({ type: 'property', property: { key: 'text', value: { type: 'string', value: text, multiline: false } } });
    return { kind: 'Link', name: `${block.name}_${index + 1}`, composition: [], entries };
  });
}

export function readCanvasTree(model: SflBlock | undefined, resolution: CanvasResolution): CanvasTree {
  const entities: SflEntityOut[] = [];
  const linkBlocks: SflBlock[] = [];
  const { entityReaderContext } = resolution;
  const { mergedProps, layoutProp } = entityReaderContext;

  const visit = (block: SflBlock, origin: { x: number; y: number }, frameId?: string): SflGroupOut[] => {
    const groups: SflGroupOut[] = [];
    const nextFlowPosition = createFlowPositioner(block, resolution);

    for (const child of childBlocks(block)) {
      if (child.kind === 'Container') {
        const size = tupleVals(layoutProp(child, 'size')) ?? [0, 0];
        const entity = buildEntity(child, origin, entityReaderContext, frameId, nextFlowPosition(size));
        entities.push(entity);
        groups.push(...visit(child, { x: entity.x, y: entity.y }, entity.id));
      } else if (['Entity', 'Table', 'Path', 'Chart'].includes(child.kind)) {
        const size = tupleVals(layoutProp(child, 'size')) ?? [0, 0];
        entities.push(buildEntity(child, origin, entityReaderContext, frameId, nextFlowPosition(size)));
      } else if (child.kind === 'Group') {
        const props = mergedProps(child);
        groups.push({
          id: asString(props.get('id')) ?? child.name,
          name: asString(props.get('text')) ?? child.name,
          color: asString(props.get('color')),
          icon: asString(props.get('icon')),
          entityIds: directMemberIds(child),
          subGroups: visit(child, origin, frameId),
          parentFrameId: frameId ?? asString(props.get('parent')),
        });
      } else if (child.kind === 'Link') {
        linkBlocks.push(child);
      } else if (child.kind === 'Net') {
        linkBlocks.push(...expandNet(child, resolution));
      }
    }
    return groups;
  };

  const groups = model ? visit(model, { x: 0, y: 0 }) : [];
  return { entities, groups, linkBlocks };
}

