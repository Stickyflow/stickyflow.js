import { findChildBlock, type LineRange } from './blocks';

const BLOCK_SEGMENT = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[([A-Za-z_][A-Za-z0-9_]*)\])?$/;
const PROPERTY_SEGMENT = /^([A-Za-z_][A-Za-z0-9_]*)((?:\[\d+\])*)$/;

export interface BlockSegment {
  name: string;
  id?: string;
}

export interface PropertySegment {
  name: string;
  indices: number[];
}

export interface PropertyPath {
  blocks: BlockSegment[];
  property: PropertySegment;
}

export function parsePropertyPath(path: string): PropertyPath | null {
  const segments = path.split('.');
  const last = segments[segments.length - 1];
  if (segments.length === 0 || last === undefined) {
    return null;
  }

  const property = parsePropertySegment(last);
  if (property === null) {
    return null;
  }

  const blocks: BlockSegment[] = [];
  for (const segment of segments.slice(0, -1)) {
    const block = parseBlockSegment(segment);
    if (block === null) {
      return null;
    }
    blocks.push(block);
  }
  return { blocks, property };
}

function parseBlockSegment(segment: string): BlockSegment | null {
  const match = segment.match(BLOCK_SEGMENT);
  if (!match) {
    return null;
  }
  return match[2] === undefined ? { name: match[1] } : { name: match[1], id: match[2] };
}

function parsePropertySegment(segment: string): PropertySegment | null {
  const match = segment.match(PROPERTY_SEGMENT);
  if (!match) {
    return null;
  }
  const indices = [...match[2].matchAll(/\d+/g)].map(entry => Number(entry[0]));
  return { name: match[1], indices };
}

export function resolveBlocks(lines: string[], owner: LineRange, blocks: readonly BlockSegment[]): LineRange | null {
  let range = owner;
  for (const block of blocks) {
    const next = findChildBlock(lines, range, blockHeader(block));
    if (next === null) {
      return null;
    }
    range = next;
  }
  return range;
}

function blockHeader(block: BlockSegment): RegExp {
  return block.id === undefined
    ? new RegExp(`^\\s*${block.name}\\s*\\{`)
    : new RegExp(`^\\s*${block.name}\\s+${block.id}\\s*\\{`);
}
