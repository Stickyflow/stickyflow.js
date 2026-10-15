import type { BlockKind, SflBinding, SflBlock, SflDocument, SflExpr, SflHandler } from '../sflLanguage/ast';
import { collectContracts, visitBlocks } from './contract';
import { collectRefs, inferType, type TypeScope } from './expression';
import { BINDABLE_PROPERTIES } from './targets';
import {
  type BindingDiagnostic,
  type BindingType,
  type BoundAssignment,
  type BoundHandler,
  type BoundProperty,
  type DataSourceContract,
  type ElementInfo,
  POINTER_EVENTS,
  sameType,
  TICK_EVENT,
  typeName,
} from './types';

export interface BindingGraph {
  contracts: Map<string, DataSourceContract>;
  bindings: BoundProperty[];
  handlers: BoundHandler[];
  // The shapes, texts and widgets of the document, by name; their state can be read in expressions.
  elements: Map<string, ElementInfo>;
  // "source.field" -> the bindings that read it; a source change only touches these.
  byField: Map<string, BoundProperty[]>;
  diagnostics: BindingDiagnostic[];
}

interface BindingSite {
  kind: BlockKind;
  path: string[];
  binding: SflBinding;
}

// Bindings sit where the property sits: on a block, in its data block (charts), or on a series.
function collectSites(blocks: SflBlock[], chartPath: string[], sites: BindingSite[]): void {
  for (const block of blocks) {
    const path = block.kind === 'Series' ? [...chartPath, block.name] : [block.name];
    const ownChart = block.kind === 'Chart' ? [block.name] : chartPath;
    for (const entry of block.entries) {
      if (entry.type === 'binding') {
        sites.push({ kind: block.kind, path, binding: entry.binding });
      } else if (entry.type === 'style') {
        for (const binding of entry.style.bindings ?? []) {
          sites.push({ kind: block.kind, path, binding });
        }
      } else if (entry.type === 'block') {
        collectSites([entry.block], ownChart, sites);
      } else if (entry.type === 'data') {
        for (const inner of entry.data.entries) {
          if (inner.type === 'binding') {
            sites.push({ kind: 'Chart', path: ownChart, binding: inner.binding });
          } else if (inner.type === 'block') {
            collectSites([inner.block], ownChart, sites);
          }
        }
      }
    }
  }
}

function fieldType(contract: DataSourceContract, field: string): BindingType | undefined {
  const type = contract.fields[field];
  if (!type) {
    return undefined;
  }
  return contract.mode === 'table' ? { list: type } : type;
}

const INTERACTIVE_KINDS: BlockKind[] = ['Shape', 'Text', 'Widget'];
const SCALE_WIDGETS = ['ruler', 'tickScale'];

function collectElements(sflDocument: SflDocument): Map<string, ElementInfo> {
  const elements = new Map<string, ElementInfo>();
  visitBlocks(sflDocument.blocks, block => {
    if (!INTERACTIVE_KINDS.includes(block.kind) || elements.has(block.name)) {
      return;
    }
    const type = block.entries.find(entry => entry.type === 'property' && entry.property.key === 'type');
    const value = type?.type === 'property' ? type.property.value : undefined;
    elements.set(block.name, { kind: block.kind, widgetType: value?.type === 'ident' ? value.segments.join('.') : undefined });
  });
  return elements;
}

// `pressed` and `hovered` exist on every element; `pointer` on a widget with a scale.
function elementStateType(element: ElementInfo, state: string): BindingType | undefined {
  if (state === 'pressed' || state === 'hovered') {
    return 'boolean';
  }
  return state === 'pointer' && element.kind === 'Widget' && SCALE_WIDGETS.includes(element.widgetType ?? '') ? 'number' : undefined;
}

// A data source wins over an element of the same name. `time.delta` is only known while a source ticks.
function createScope(contracts: Map<string, DataSourceContract>, elements: Map<string, ElementInfo>, ticking = false): TypeScope {
  return {
    resolve(path) {
      if (path.length !== 2) {
        return undefined;
      }
      const contract = contracts.get(path[0]);
      if (contract) {
        return fieldType(contract, path[1]);
      }
      if (ticking && path[0] === 'time' && path[1] === 'delta') {
        return 'number';
      }
      const element = elements.get(path[0]);
      return element ? elementStateType(element, path[1]) : undefined;
    },
  };
}

// Inside a source, a bare name is a field of that source.
function qualify(expr: SflExpr, source: DataSourceContract): SflExpr {
  switch (expr.kind) {
    case 'ref':
      return expr.path.length === 1 && expr.path[0] in source.fields ? { kind: 'ref', path: [source.name, expr.path[0]] } : expr;
    case 'unary':
      return { ...expr, operand: qualify(expr.operand, source) };
    case 'binary':
      return { ...expr, left: qualify(expr.left, source), right: qualify(expr.right, source) };
    case 'call':
      return { ...expr, args: expr.args.map(arg => qualify(arg, source)) };
    default:
      return expr;
  }
}

interface HandlerSite {
  kind: BlockKind;
  name: string;
  handler: SflHandler;
}

function collectHandlerSites(sflDocument: SflDocument): HandlerSite[] {
  const sites: HandlerSite[] = [];
  visitBlocks(sflDocument.blocks, block => {
    for (const entry of block.entries) {
      if (entry.type === 'handler') {
        sites.push({ kind: block.kind, name: block.name, handler: entry.handler });
      }
    }
  });
  return sites;
}

function bindHandler(
  site: HandlerSite,
  contracts: Map<string, DataSourceContract>,
  elements: Map<string, ElementInfo>,
  diagnostics: BindingDiagnostic[],
): BoundHandler | undefined {
  const { kind, name, handler } = site;
  const report = (code: string, message: string, line = handler.line, col = handler.col) =>
    diagnostics.push({ severity: 'error', code, message, line, col });
  const ticking = kind === 'DataSource';
  const allowed: readonly string[] = ticking ? [TICK_EVENT] : INTERACTIVE_KINDS.includes(kind) ? POINTER_EVENTS : [];
  if (!allowed.includes(handler.event)) {
    report(
      'unknown-event',
      allowed.length
        ? `${kind} '${name}' has no event '${handler.event}' (events: ${allowed.join(', ')}).`
        : `${kind} '${name}' has no events; handlers belong on a Shape, Text, Widget or DataSource.`,
    );
    return undefined;
  }
  const own = ticking ? contracts.get(name) : undefined;
  if (ticking && own?.mode !== 'record') {
    report('tick-needs-record', `DataSource '${name}' has to be a record source to change its fields on every tick.`);
    return undefined;
  }
  const scope = createScope(contracts, elements, ticking);
  const assignments: BoundAssignment[] = [];
  for (const assignment of handler.assignments) {
    const at = (code: string, message: string) => report(code, message, assignment.line, assignment.col);
    const target = assignment.target.join('.');
    const [source, field] = own && assignment.target.length === 1 ? [own.name, assignment.target[0]] : assignment.target;
    const contract = assignment.target.length <= 2 ? contracts.get(source) : undefined;
    if (!contract || field === undefined) {
      at('unknown-target', `'${target}' is not a field of a DataSource (write <DataSource>.<field>).`);
      continue;
    }
    if (own && contract !== own) {
      at('tick-foreign-target', `onTick of '${name}' can only change fields of '${name}', not '${target}'.`);
      continue;
    }
    if (contract.mode !== 'record') {
      at('target-not-record', `DataSource '${source}' is a table source; only record sources can be changed by a handler.`);
      continue;
    }
    const wanted = contract.fields[field];
    if (!wanted) {
      at('unknown-target', `DataSource '${source}' has no field '${field}'.`);
      continue;
    }
    const expr = own ? qualify(assignment.expr, own) : assignment.expr;
    const actual = inferType(expr, scope, (code, message) => at(code, message));
    if (!actual) {
      continue;
    }
    if (!sameType(actual, wanted)) {
      at('type-mismatch', `'${target}' is ${wanted}, the expression is ${typeName(actual)}.`);
      continue;
    }
    assignments.push({ source, field, expr, type: wanted, line: assignment.line, col: assignment.col });
  }
  return {
    id: `${kind}.${name}.${handler.event}`,
    ownerKind: kind,
    ownerPath: [name],
    event: handler.event,
    assignments,
    line: handler.line,
    col: handler.col,
  };
}

export function buildBindingGraph(sflDocument: SflDocument): BindingGraph {
  const { contracts, diagnostics } = collectContracts(sflDocument);
  const elements = collectElements(sflDocument);
  for (const name of elements.keys()) {
    if (contracts.has(name)) {
      diagnostics.push({
        severity: 'warning',
        code: 'name-collision',
        message: `'${name}' is a DataSource and an element; in expressions it means the DataSource.`,
        line: 0,
        col: 0,
      });
    }
  }
  const scope = createScope(contracts, elements);
  const bindings: BoundProperty[] = [];
  const sites: BindingSite[] = [];
  collectSites(sflDocument.blocks, [], sites);

  for (const { kind, path, binding } of sites) {
    const owner = path.join('.');
    const report = (code: string, message: string, severity: 'error' | 'warning' = 'error') =>
      diagnostics.push({ severity, code, message, line: binding.line, col: binding.col });
    if (binding.operator !== '<-') {
      report(
        'binding-operator-unsupported',
        `'${binding.operator}' on '${binding.key}' is parsed but not executed yet; only '<-' is supported.`,
        'warning',
      );
      continue;
    }
    // A shader takes any numeric parameter of its program.
    const expected = kind === 'Shader' ? 'number' : BINDABLE_PROPERTIES[kind]?.[binding.key];
    if (!expected) {
      const allowed = Object.keys(BINDABLE_PROPERTIES[kind] ?? {});
      report(
        'unknown-bound-property',
        `${kind} '${owner}' has no bindable property '${binding.key}'${allowed.length ? ` (bindable: ${allowed.join(', ')})` : ''}.`,
      );
      continue;
    }
    const actual = inferType(binding.expr, scope, report);
    if (!actual) {
      continue;
    }
    if (!sameType(actual, expected)) {
      report('type-mismatch', `'${binding.key}' expects ${typeName(expected)}, the expression is ${typeName(actual)}.`);
      continue;
    }
    const dependencies = [...new Set(collectRefs(binding.expr).map(ref => ref.join('.')))];
    bindings.push({
      id: `${kind}.${owner}.${binding.key}`,
      ownerKind: kind,
      ownerPath: path,
      property: binding.key,
      operator: binding.operator,
      expr: binding.expr,
      type: expected,
      dependencies,
      line: binding.line,
      col: binding.col,
    });
  }

  const byField = new Map<string, BoundProperty[]>();
  for (const binding of bindings) {
    for (const dependency of binding.dependencies) {
      byField.set(dependency, [...(byField.get(dependency) ?? []), binding]);
    }
  }
  const handlers = collectHandlerSites(sflDocument).flatMap(site => bindHandler(site, contracts, elements, diagnostics) ?? []);
  return { contracts, bindings, handlers, elements, byField, diagnostics };
}
