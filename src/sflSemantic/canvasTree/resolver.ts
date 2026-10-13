import type { SflBlock } from '../../sflLanguage/ast';
import { childBlocks } from '../ast/blockEntries';
import { asString, tupleValues } from '../ast/valueAccess';
import { expandNetLinks } from '../canvasObjects/artifacts/links/netExpansion';
import { isCanvasObjectBlockKind } from '../canvasObjects/processing/blockKinds';
import { createFlowPositioner, type FlowPositioner } from '../canvasObjects/processing/layout/flow';
import { type CanvasObjectResolutionContext, resolveCanvasObject } from '../canvasObjects/processing/resolver';
import type { CanvasResolution } from '../canvasState/resolution';
import { directGroupMemberIds } from '../groups/members';
import type { SflCanvasObject, SflGroupOut } from '../types';

export interface CanvasTree {
  canvasObjects: SflCanvasObject[];
  groups: SflGroupOut[];
  linkBlocks: SflBlock[];
  connectionBlocks: SflBlock[];
  linkSourceIndexes: number[];
  connectionSourceIndexes: number[];
}

interface CanvasLocation {
  origin: { x: number; y: number };
  frameId?: string;
}

class CanvasTreeResolver {
  readonly #context: CanvasObjectResolutionContext;
  readonly #canvasObjects: SflCanvasObject[] = [];
  readonly #linkBlocks: SflBlock[] = [];
  readonly #connectionBlocks: SflBlock[] = [];
  readonly #linkSourceIndexes: number[] = [];
  readonly #connectionSourceIndexes: number[] = [];
  #sequence = 0;

  constructor(resolution: CanvasResolution) {
    this.#context = resolution.canvasObjectResolutionContext;
  }

  resolve(model: SflBlock | undefined): CanvasTree {
    const groups = model ? this.#resolveChildren(model, { origin: { x: 0, y: 0 } }) : [];
    return {
      canvasObjects: this.#canvasObjects,
      groups,
      linkBlocks: this.#linkBlocks,
      connectionBlocks: this.#connectionBlocks,
      linkSourceIndexes: this.#linkSourceIndexes,
      connectionSourceIndexes: this.#connectionSourceIndexes,
    };
  }

  #resolveChildren(block: SflBlock, location: CanvasLocation): SflGroupOut[] {
    const groups: SflGroupOut[] = [];
    const nextFlowPosition = createFlowPositioner(block, this.#context);

    for (const child of childBlocks(block)) {
      groups.push(...this.#resolveChild(child, location, nextFlowPosition));
    }
    return groups;
  }

  #resolveChild(child: SflBlock, location: CanvasLocation, nextFlowPosition: FlowPositioner): SflGroupOut[] {
    const sourceIndex = this.#sequence++;
    if (child.kind === 'Container') {
      return this.#resolveContainer(child, location, nextFlowPosition, sourceIndex);
    }
    if (isCanvasObjectBlockKind(child.kind)) {
      this.#resolveCanvasObject(child, location, nextFlowPosition, sourceIndex);
      return [];
    }

    switch (child.kind) {
      case 'Group':
        return [this.#resolveGroup(child, location)];
      case 'Link':
        this.#linkBlocks.push(child);
        this.#linkSourceIndexes.push(sourceIndex);
        return [];
      case 'Connection':
        this.#connectionBlocks.push(child);
        this.#connectionSourceIndexes.push(sourceIndex);
        return [];
      case 'Net': {
        const expanded = expandNetLinks(child, this.#context);
        this.#linkBlocks.push(...expanded);
        this.#linkSourceIndexes.push(...expanded.map(() => sourceIndex));
        return [];
      }
      default:
        return [];
    }
  }

  #resolveContainer(
    block: SflBlock,
    location: CanvasLocation,
    nextFlowPosition: FlowPositioner,
    sourceIndex: number,
  ): SflGroupOut[] {
    const canvasObject = this.#resolvePositionedCanvasObject(block, location, nextFlowPosition, sourceIndex);
    this.#canvasObjects.push(canvasObject);
    return this.#resolveChildren(block, {
      origin: { x: canvasObject.x, y: canvasObject.y },
      frameId: canvasObject.id,
    });
  }

  #resolveCanvasObject(
    block: SflBlock,
    location: CanvasLocation,
    nextFlowPosition: FlowPositioner,
    sourceIndex: number,
  ): void {
    this.#canvasObjects.push(this.#resolvePositionedCanvasObject(block, location, nextFlowPosition, sourceIndex));
  }

  #resolvePositionedCanvasObject(
    block: SflBlock,
    location: CanvasLocation,
    nextFlowPosition: FlowPositioner,
    sourceIndex: number,
  ): SflCanvasObject {
    const size = tupleValues(this.#context.layoutProp(block, 'size')) ?? [0, 0];
    return {
      ...resolveCanvasObject(block, location.origin, this.#context, location.frameId, nextFlowPosition(size)),
      sourceIndex,
    };
  }

  #resolveGroup(block: SflBlock, location: CanvasLocation): SflGroupOut {
    const properties = this.#context.mergedProps(block);
    return {
      id: asString(properties.get('id')) ?? block.name,
      name: asString(properties.get('text')) ?? block.name,
      color: asString(properties.get('color')),
      icon: asString(properties.get('icon')),
      canvasObjectIds: directGroupMemberIds(block),
      subGroups: this.#resolveChildren(block, location),
      parentFrameId: location.frameId ?? asString(properties.get('parent')),
    };
  }
}

export function resolveCanvasTree(model: SflBlock | undefined, resolution: CanvasResolution): CanvasTree {
  return new CanvasTreeResolver(resolution).resolve(model);
}
