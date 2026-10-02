import type { SflBlock } from '../ast';
import { childBlocks } from './blockEntries';
import { isCanvasEntityBlockKind } from './canvasEntityBlocks';
import { buildEntity, type EntityReaderContext } from './entityReader';
import { createFlowPositioner, type FlowPositioner } from './flowLayout';
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

interface CanvasLocation {
  origin: { x: number; y: number };
  frameId?: string;
}

class CanvasTreeReader {
  readonly #context: EntityReaderContext;
  readonly #entities: SflEntityOut[] = [];
  readonly #linkBlocks: SflBlock[] = [];

  constructor(resolution: CanvasResolution) {
    this.#context = resolution.entityReaderContext;
  }

  read(model: SflBlock | undefined): CanvasTree {
    const groups = model ? this.#readChildren(model, { origin: { x: 0, y: 0 } }) : [];
    return { entities: this.#entities, groups, linkBlocks: this.#linkBlocks };
  }

  #readChildren(block: SflBlock, location: CanvasLocation): SflGroupOut[] {
    const groups: SflGroupOut[] = [];
    const nextFlowPosition = createFlowPositioner(block, this.#context);

    for (const child of childBlocks(block)) {
      groups.push(...this.#readChild(child, location, nextFlowPosition));
    }
    return groups;
  }

  #readChild(child: SflBlock, location: CanvasLocation, nextFlowPosition: FlowPositioner): SflGroupOut[] {
    if (child.kind === 'Container') {
      return this.#readContainer(child, location, nextFlowPosition);
    }
    if (isCanvasEntityBlockKind(child.kind)) {
      this.#readEntity(child, location, nextFlowPosition);
      return [];
    }

    switch (child.kind) {
      case 'Group':
        return [this.#readGroup(child, location)];
      case 'Link':
        this.#readLink(child);
        return [];
      case 'Net':
        this.#readNet(child);
        return [];
      default:
        return [];
    }
  }

  #readContainer(block: SflBlock, location: CanvasLocation, nextFlowPosition: FlowPositioner): SflGroupOut[] {
    const entity = this.#buildPositionedEntity(block, location, nextFlowPosition);
    this.#entities.push(entity);
    return this.#readChildren(block, { origin: { x: entity.x, y: entity.y }, frameId: entity.id });
  }

  #readEntity(block: SflBlock, location: CanvasLocation, nextFlowPosition: FlowPositioner): void {
    this.#entities.push(this.#buildPositionedEntity(block, location, nextFlowPosition));
  }

  #buildPositionedEntity(block: SflBlock, location: CanvasLocation, nextFlowPosition: FlowPositioner): SflEntityOut {
    const size = tupleValues(this.#context.layoutProp(block, 'size')) ?? [0, 0];
    return buildEntity(block, location.origin, this.#context, location.frameId, nextFlowPosition(size));
  }

  #readGroup(block: SflBlock, location: CanvasLocation): SflGroupOut {
    const properties = this.#context.mergedProps(block);
    return {
      id: asString(properties.get('id')) ?? block.name,
      name: asString(properties.get('text')) ?? block.name,
      color: asString(properties.get('color')),
      icon: asString(properties.get('icon')),
      entityIds: directGroupMemberIds(block),
      subGroups: this.#readChildren(block, location),
      parentFrameId: location.frameId ?? asString(properties.get('parent')),
    };
  }

  #readLink(block: SflBlock): void {
    this.#linkBlocks.push(block);
  }

  #readNet(block: SflBlock): void {
    this.#linkBlocks.push(...expandNetLinks(block, this.#context));
  }
}

export function readCanvasTree(model: SflBlock | undefined, resolution: CanvasResolution): CanvasTree {
  return new CanvasTreeReader(resolution).read(model);
}
