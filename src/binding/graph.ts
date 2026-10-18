import type { BlockKind, SflBinding, SflBlock, SflDocument, SflExpr, SflHandler } from '../sflLanguage/ast';
import {
  acceptsUserChange,
  BINDABLE_COMPONENT_PROPERTIES,
  componentPropertyType,
  componentStateType,
  twoWayTargetProblem,
} from './componentBinding';
import { collectContracts, visitBlocks } from './contract';
import { collectRefs, inferType, type TypeScope } from './expression';
import { BINDABLE_PROPERTIES } from './targets';
import {
  type BindingDiagnostic,
  type BindingType,
  type BoundAssignment,
  type BoundHandler,
  type BoundProperty,
  CHANGE_EVENT,
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
  elements: Map<string, ElementInfo>;
  byField: Map<string, BoundProperty[]>;
  diagnostics: BindingDiagnostic[];
}

interface BindingSite {
  kind: BlockKind;
  path: string[];
  binding: SflBinding;
}

function collectSites(blocks: SflBlock[], chartPath: string[], sites: BindingSite[]): void {
  for (const block of blocks) {
    const path = block.kind === 'Series' ? [...chartPath, block.name] : [block.name];
    const ownChart = block.kind === 'Chart' ? [block.name] : chartPath;
    for (const entry of block.entries) {
      if (entry.type === 'binding') {
        sites.push({ kind: blockKind(block), path, binding: entry.binding });
      } else if (entry.type === 'style') {
        for (const binding of entry.style.bindings ?? []) {
          sites.push({ kind: blockKind(block), path, binding });
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

const INTERACTIVE_KINDS: BlockKind[] = ['Shape', 'Text', 'Component'];
const blockKind = (block: SflBlock): BlockKind => (block.kind === 'Widget' ? 'Component' : block.kind);

function collectElements(sflDocument: SflDocument): Map<string, ElementInfo> {
  const elements = new Map<string, ElementInfo>();
  visitBlocks(sflDocument.blocks, block => {
    if (!INTERACTIVE_KINDS.includes(blockKind(block)) || elements.has(block.name)) {
      return;
    }
    const type = block.entries.find(entry => entry.type === 'property' && entry.property.key === 'type');
    const value = type?.type === 'property' ? type.property.value : undefined;
    elements.set(block.name, {
      kind: blockKind(block),
      componentType: value?.type === 'ident' ? value.segments.join('.') : undefined,
    });
  });
  return elements;
}

function elementStateType(element: ElementInfo, state: string): BindingType | undefined {
  if (state === 'pressed' || state === 'hovered') {
    return 'boolean';
  }
  return element.kind === 'Component' ? componentStateType(element.componentType, state) : undefined;
}

function createScope(
  contracts: Map<string, DataSourceContract>,
  elements: Map<string, ElementInfo>,
  ticking = false,
): TypeScope {
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

function qualify(expr: SflExpr, source: DataSourceContract): SflExpr {
  switch (expr.kind) {
    case 'ref':
      return expr.path.length === 1 && expr.path[0] in source.fields
        ? { kind: 'ref', path: [source.name, expr.path[0]] }
        : expr;
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
        sites.push({ kind: blockKind(block), name: block.name, handler: entry.handler });
      }
    }
  });
  return sites;
}

type Report = (code: string, message: string, line?: number, col?: number) => void;

function allowedEvents(kind: BlockKind, componentType: string | undefined): readonly string[] {
  if (kind === 'DataSource') {
    return [TICK_EVENT];
  }
  if (!INTERACTIVE_KINDS.includes(kind)) {
    return [];
  }
  const changes = kind === 'Component' && acceptsUserChange(componentType);
  return changes ? [...POINTER_EVENTS, CHANGE_EVENT] : POINTER_EVENTS;
}

function eventIsKnown(site: HandlerSite, componentType: string | undefined, report: Report): boolean {
  const { kind, name, handler } = site;
  const allowed = allowedEvents(kind, componentType);
  if (allowed.includes(handler.event)) {
    return true;
  }
  report(
    'unknown-event',
    allowed.length
      ? `${kind} '${name}' has no event '${handler.event}' (events: ${allowed.join(', ')}).`
      : `${kind} '${name}' has no events; handlers belong on a Shape, Text, Component or DataSource.`,
  );
  return false;
}

function bindAssignment(
  assignment: SflHandler['assignments'][number],
  name: string,
  own: DataSourceContract | undefined,
  contracts: Map<string, DataSourceContract>,
  scope: TypeScope,
  report: Report,
): BoundAssignment | undefined {
  const at = (code: string, message: string) => report(code, message, assignment.line, assignment.col);
  const target = assignment.target.join('.');
  const [source, field] = own && assignment.target.length === 1 ? [own.name, assignment.target[0]] : assignment.target;
  const contract = assignment.target.length <= 2 ? contracts.get(source) : undefined;
  if (!contract || field === undefined) {
    at('unknown-target', `'${target}' is not a field of a DataSource (write <DataSource>.<field>).`);
    return undefined;
  }
  if (own && contract !== own) {
    at('tick-foreign-target', `onTick of '${name}' can only change fields of '${name}', not '${target}'.`);
    return undefined;
  }
  if (contract.mode !== 'record') {
    at(
      'target-not-record',
      `DataSource '${source}' is a table source; only record sources can be changed by a handler.`,
    );
    return undefined;
  }
  const wanted = contract.fields[field];
  if (!wanted) {
    at('unknown-target', `DataSource '${source}' has no field '${field}'.`);
    return undefined;
  }
  const expr = own ? qualify(assignment.expr, own) : assignment.expr;
  const actual = inferType(expr, scope, (code, message) => at(code, message));
  if (!actual) {
    return undefined;
  }
  if (!sameType(actual, wanted)) {
    at('type-mismatch', `'${target}' is ${wanted}, the expression is ${typeName(actual)}.`);
    return undefined;
  }
  return { source, field, expr, type: wanted, line: assignment.line, col: assignment.col };
}

function bindHandler(
  site: HandlerSite,
  contracts: Map<string, DataSourceContract>,
  elements: Map<string, ElementInfo>,
  diagnostics: BindingDiagnostic[],
): BoundHandler | undefined {
  const { kind, name, handler } = site;
  const report: Report = (code, message, line = handler.line, col = handler.col) =>
    diagnostics.push({ severity: 'error', code, message, line, col });
  if (!eventIsKnown(site, elements.get(name)?.componentType, report)) {
    return undefined;
  }
  const ticking = kind === 'DataSource';
  const own = ticking ? contracts.get(name) : undefined;
  if (ticking && own?.mode !== 'record') {
    report('tick-needs-record', `DataSource '${name}' has to be a record source to change its fields on every tick.`);
    return undefined;
  }
  const scope = createScope(contracts, elements, ticking);
  const assignments = handler.assignments.flatMap(
    assignment => bindAssignment(assignment, name, own, contracts, scope, report) ?? [],
  );
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

function warnNameCollisions(
  contracts: Map<string, DataSourceContract>,
  elements: Map<string, ElementInfo>,
  diagnostics: BindingDiagnostic[],
): void {
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
}

function expectedType(site: BindingSite, elements: Map<string, ElementInfo>): BindingType | undefined {
  const { kind, path, binding } = site;
  if (kind === 'Shader') {
    return 'number';
  }
  if (kind === 'Component') {
    return componentPropertyType(elements.get(path[0])?.componentType, binding.key);
  }
  return BINDABLE_PROPERTIES[kind]?.[binding.key];
}

function canBindTwoWay(site: BindingSite, elements: Map<string, ElementInfo>): boolean {
  const { kind, path, binding } = site;
  return kind === 'Component' && binding.key === 'value' && acceptsUserChange(elements.get(path[0])?.componentType);
}

interface RejectedOperator {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

function rejectedOperator(
  site: BindingSite,
  elements: Map<string, ElementInfo>,
  contracts: Map<string, DataSourceContract>,
): RejectedOperator | undefined {
  const { binding } = site;
  const twoWay = binding.operator === '<->';
  if (binding.operator === '->' || (twoWay && !canBindTwoWay(site, elements))) {
    return {
      code: 'binding-operator-unsupported',
      message: `'${binding.operator}' on '${binding.key}' is parsed but not executed; '<->' works on the value of a component that the user can change, and '->' is not supported.`,
      severity: 'warning',
    };
  }
  const problem = twoWay ? twoWayTargetProblem(binding.key, binding.expr, contracts) : undefined;
  return problem ? { code: 'two-way-target', message: problem, severity: 'error' } : undefined;
}

function bindProperty(
  site: BindingSite,
  scope: TypeScope,
  elements: Map<string, ElementInfo>,
  contracts: Map<string, DataSourceContract>,
  diagnostics: BindingDiagnostic[],
): BoundProperty | undefined {
  const { kind, path, binding } = site;
  const owner = path.join('.');
  const report = (code: string, message: string, severity: 'error' | 'warning' = 'error') =>
    diagnostics.push({ severity, code, message, line: binding.line, col: binding.col });
  const rejected = rejectedOperator(site, elements, contracts);
  if (rejected) {
    report(rejected.code, rejected.message, rejected.severity);
    return undefined;
  }
  const expected = expectedType(site, elements);
  if (!expected) {
    const allowed = kind === 'Component' ? BINDABLE_COMPONENT_PROPERTIES : Object.keys(BINDABLE_PROPERTIES[kind] ?? {});
    report(
      'unknown-bound-property',
      `${kind} '${owner}' has no bindable property '${binding.key}'${allowed.length ? ` (bindable: ${allowed.join(', ')})` : ''}.`,
    );
    return undefined;
  }
  const actual = inferType(binding.expr, scope, report);
  if (!actual) {
    return undefined;
  }
  if (!sameType(actual, expected)) {
    report('type-mismatch', `'${binding.key}' expects ${typeName(expected)}, the expression is ${typeName(actual)}.`);
    return undefined;
  }
  return {
    id: `${kind}.${owner}.${binding.key}`,
    ownerKind: kind,
    ownerPath: path,
    property: binding.key,
    operator: binding.operator,
    expr: binding.expr,
    type: expected,
    dependencies: [...new Set(collectRefs(binding.expr).map(ref => ref.join('.')))],
    line: binding.line,
    col: binding.col,
  };
}

function indexByField(bindings: BoundProperty[]): Map<string, BoundProperty[]> {
  const byField = new Map<string, BoundProperty[]>();
  for (const binding of bindings) {
    for (const dependency of binding.dependencies) {
      byField.set(dependency, [...(byField.get(dependency) ?? []), binding]);
    }
  }
  return byField;
}

export function buildBindingGraph(sflDocument: SflDocument): BindingGraph {
  const { contracts, diagnostics } = collectContracts(sflDocument);
  const elements = collectElements(sflDocument);
  warnNameCollisions(contracts, elements, diagnostics);
  const scope = createScope(contracts, elements);
  const sites: BindingSite[] = [];
  collectSites(sflDocument.blocks, [], sites);

  const bindings = sites.flatMap(site => bindProperty(site, scope, elements, contracts, diagnostics) ?? []);
  const handlers = collectHandlerSites(sflDocument).flatMap(
    site => bindHandler(site, contracts, elements, diagnostics) ?? [],
  );
  return { contracts, bindings, handlers, elements, byField: indexByField(bindings), diagnostics };
}
