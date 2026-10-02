import type { SflBlock } from '../../ast';
import { childBlocks } from '../ast/blockEntries';
import { asString, tupleValues } from '../ast/valueAccess';
import { expandNetLinks } from '../canvasObjects/artifacts/links/netExpansion';
import { isCanvasObjectBlockKind } from '../canvasObjects/processing/blockKinds';
import { createFlowPositioner, type FlowPositioner } from '../canvasObjects/processing/layout/flow';
import { buildCanvasObject, type CanvasObjectReaderContext } from '../canvasObjects/processing/reader';
import { directGroupMemberIds } from '../groups/members';
import type { CanvasResolution } from '../resolution';
import type { SflEntityOut, SflGroupOut } from '../types';

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
  readonly #context: CanvasObjectReaderContext;
  readonly #entities: SflEntityOut[] = [];
  readonly #linkBlocks: SflBlock[] = [];

  constructor(resolution: CanvasResolution) {
    this.#context = resolution.canvasObjectReaderContext;
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
    if (isCanvasObjectBlockKind(child.kind)) {
      this.#readCanvasObject(child, location, nextFlowPosition);
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
    const canvasObject = this.#buildPositionedCanvasObject(block, location, nextFlowPosition);
    this.#entities.push(canvasObject);
    return this.#readChildren(block, {
      origin: { x: canvasObject.x, y: canvasObject.y },
      frameId: canvasObject.id,
    });
  }

  #readCanvasObject(block: SflBlock, location: CanvasLocation, nextFlowPosition: FlowPositioner): void {
    this.#entities.push(this.#buildPositionedCanvasObject(block, location, nextFlowPosition));
  }

  #buildPositionedCanvasObject(
    block: SflBlock,
    location: CanvasLocation,
    nextFlowPosition: FlowPositioner,
  ): SflEntityOut {
    const size = tupleValues(this.#context.layoutProp(block, 'size')) ?? [0, 0];
    return buildCanvasObject(block, location.origin, this.#context, location.frameId, nextFlowPosition(size));
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
