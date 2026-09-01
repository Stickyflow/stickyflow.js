import type { SflBlock } from '../ast';
import { childBlocks } from './blockEntries';
import { buildEntity } from './entityReader';
import { createFlowPositioner } from './flowLayout';
import { directGroupMemberIds } from './groupMembers';
import { expandNetLinks } from './netLinks';
import type { CanvasResolution } from './resolution';
import type { SflEntityOut, SflGroupOut } from './types';
import { asString, tupleValues } from './valueAccess';

export interface CanvasTree {
  entities: SflEntityOut[];
  groups: SflGroupOut[];
  linkBlocks: SflBlock[];
}

export function readCanvasTree(model: SflBlock | undefined, resolution: CanvasResolution): CanvasTree {
  const entities: SflEntityOut[] = [];
  const linkBlocks: SflBlock[] = [];
  const { entityReaderContext } = resolution;
  const { mergedProps, layoutProp } = entityReaderContext;

  const visit = (block: SflBlock, origin: { x: number; y: number }, frameId?: string): SflGroupOut[] => {
    const groups: SflGroupOut[] = [];
    const nextFlowPosition = createFlowPositioner(block, entityReaderContext);

    for (const child of childBlocks(block)) {
      if (child.kind === 'Container') {
        const size = tupleValues(layoutProp(child, 'size')) ?? [0, 0];
        const entity = buildEntity(child, origin, entityReaderContext, frameId, nextFlowPosition(size));
        entities.push(entity);
        groups.push(...visit(child, { x: entity.x, y: entity.y }, entity.id));
      } else if (['Entity', 'Table', 'Path', 'Chart'].includes(child.kind)) {
        const size = tupleValues(layoutProp(child, 'size')) ?? [0, 0];
        entities.push(buildEntity(child, origin, entityReaderContext, frameId, nextFlowPosition(size)));
      } else if (child.kind === 'Group') {
        const props = mergedProps(child);
        groups.push({
          id: asString(props.get('id')) ?? child.name,
          name: asString(props.get('text')) ?? child.name,
          color: asString(props.get('color')),
          icon: asString(props.get('icon')),
          entityIds: directGroupMemberIds(child),
          subGroups: visit(child, origin, frameId),
          parentFrameId: frameId ?? asString(props.get('parent')),
        });
      } else if (child.kind === 'Link') {
        linkBlocks.push(child);
      } else if (child.kind === 'Net') {
        linkBlocks.push(...expandNetLinks(child, entityReaderContext));
      }
    }
    return groups;
  };

  const groups = model ? visit(model, { x: 0, y: 0 }) : [];
  return { entities, groups, linkBlocks };
}
