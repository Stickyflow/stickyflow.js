import type { SflBlock, SflDocument, SflEntry, SflValue } from '../ast';
import { resolveNumeric } from './evaluation';
import { instance } from './instance';
import { Random } from './random';
import { expandRepeatBlocks, hasRepeats, type RepeatData } from './repeat';
import { fail, type Scalar, type Scope, type Tables } from './scope';
import { expandUses, hasTemplates } from './template';

const isComputed = (value: SflValue): boolean =>
  value.type === 'expr' || (value.type === 'list' && value.values.some(isComputed));

// A computed value is worked out for a cell of a Repeat or for a Use, so one that is left over has no cell to be worked out for.
function checkNoComputed(blocks: SflBlock[]): void {
  for (const block of blocks) {
    for (const entry of block.entries) {
      const properties =
        entry.type === 'property'
          ? [entry.property]
          : entry.type === 'layout'
            ? entry.layout.properties
            : entry.type === 'style'
              ? entry.style.properties
              : [];
      for (const property of properties) {
        if (isComputed(property.value)) {
          throw new Error(
            `${block.kind} ${block.name}: ${property.key} is computed, and only a Repeat can work out a computed value`,
          );
        }
      }
      if (entry.type === 'block') {
        checkNoComputed([entry.block]);
      }
    }
  }
}

function parameterBlocks(blocks: SflBlock[]): SflBlock[] {
  return blocks.flatMap(block => [
    ...(block.kind === 'Parameters' ? [block] : []),
    ...parameterBlocks(block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []))),
  ]);
}

function withoutParameters(blocks: SflBlock[]): SflBlock[] {
  return blocks.flatMap(block =>
    block.kind === 'Parameters'
      ? []
      : [
          {
            ...block,
            entries: block.entries.flatMap((entry): SflEntry[] =>
              entry.type !== 'block'
                ? [entry]
                : entry.block.kind === 'Parameters'
                  ? []
                  : [{ type: 'block' as const, block: withoutParameters([entry.block])[0] }],
            ),
          },
        ],
  );
}

// The values of the Parameters blocks. A parameter can be computed from the ones before it.
function readParameters(blocks: SflBlock[]): Map<string, Scalar> {
  const params = new Map<string, Scalar>();
  for (const block of parameterBlocks(blocks)) {
    const scope: Scope = { vars: new Map(), params, random: new Random(0), label: `Parameters ${block.name}` };
    for (const entry of block.entries) {
      if (entry.type !== 'property') {
        fail(scope, 'Parameters hold only properties');
      }
      const value = resolveNumeric(scope, entry.property.value);
      if (value.type === 'number' || value.type === 'string') {
        params.set(entry.property.key, value.value);
      } else if (value.type === 'ident') {
        params.set(entry.property.key, value.segments.join('.'));
      } else {
        fail(scope, `${entry.property.key} needs a number, a text or a name`);
      }
    }
  }
  return params;
}

// What is left outside a Repeat or a Use is worked out with the Parameters alone.
function resolveWithParameters(blocks: SflBlock[], params: ReadonlyMap<string, Scalar>): SflBlock[] {
  return blocks.map(block =>
    instance(
      { vars: new Map(), params, random: new Random(0), label: `${block.kind} ${block.name}` },
      block,
      name => name,
    ),
  );
}

// A document in which every Repeat and every Use is replaced by the blocks it makes, and the Templates and Parameters are taken out. A
// document without any of them is returned as it is.
// A Solid with `mirror` is written a second time, with `flip` for the side it is turned to.
function withMirrors(blocks: SflBlock[]): SflBlock[] {
  return blocks.flatMap(block => {
    const inner: SflBlock = {
      ...block,
      entries: block.entries.flatMap((entry): SflEntry[] =>
        entry.type === 'block'
          ? withMirrors([entry.block]).map(child => ({ type: 'block' as const, block: child }))
          : [entry],
      ),
    };
    const mirror =
      block.kind === 'Solid' &&
      block.entries.find(entry => entry.type === 'property' && entry.property.key === 'mirror');
    if (!mirror || mirror.type !== 'property') {
      return [inner];
    }
    const twin: SflBlock = {
      ...inner,
      name: `${block.name}_mirror`,
      entries: inner.entries.map(entry =>
        entry === mirror
          ? { type: 'property' as const, property: { key: 'flip', value: mirror.property.value } }
          : entry,
      ),
    };
    return [inner, twin];
  });
}

const hasMirrors = (blocks: SflBlock[]): boolean =>
  blocks.some(
    block =>
      (block.kind === 'Solid' &&
        block.entries.some(entry => entry.type === 'property' && entry.property.key === 'mirror')) ||
      hasMirrors(block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []))),
  );

// Every DataSource of the document, and whether it holds one record or the rows of a table.
function dataSources(blocks: SflBlock[]): Map<string, 'record' | 'table'> {
  const found = new Map<string, 'record' | 'table'>();
  const visit = (block: SflBlock) => {
    if (block.kind === 'DataSource') {
      const mode = block.entries.find(entry => entry.type === 'property' && entry.property.key === 'mode');
      const record =
        mode?.type === 'property' &&
        mode.property.value.type === 'ident' &&
        mode.property.value.segments[0] === 'record';
      found.set(block.name, record ? 'record' : 'table');
    }
    for (const entry of block.entries) {
      if (entry.type === 'block') {
        visit(entry.block);
      }
    }
  };
  blocks.forEach(visit);
  return found;
}

// `tables` are the rows of the tables as the host holds them, for a Repeat that runs over one. Without them such a Repeat
// makes nothing.
export function expandDocument(doc: SflDocument, tables: Tables = new Map()): SflDocument {
  const expanded = expandCopies(doc, tables);
  return hasMirrors(expanded.blocks) ? { ...expanded, blocks: withMirrors(expanded.blocks) } : expanded;
}

function expandCopies(doc: SflDocument, tables: Tables): SflDocument {
  const params = readParameters(doc.blocks);
  const repeats = hasRepeats(doc.blocks);
  if (!repeats && !hasTemplates(doc.blocks) && params.size === 0 && parameterBlocks(doc.blocks).length === 0) {
    checkNoComputed(doc.blocks);
    return doc;
  }
  const source = withoutParameters(doc.blocks);
  const data: RepeatData = { tables, sources: dataSources(doc.blocks) };
  const expanded = expandUses(repeats ? expandRepeatBlocks(source, params, data) : source, params);
  const blocks = params.size > 0 ? resolveWithParameters(expanded, params) : expanded;
  checkNoComputed(blocks);
  return { ...doc, blocks };
}
