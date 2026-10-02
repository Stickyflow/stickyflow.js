export type EditableRules = Record<string, boolean> | ((path: string) => boolean);

const SEGMENT = '[^.\\[\\]]+';

function patternPart(part: string): string {
  if (part === '**') {
    return '.+';
  }
  if (part === '*') {
    return SEGMENT;
  }
  return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegExp(pattern: string): RegExp {
  return new RegExp(
    `^${pattern
      .split(/(\*\*|\*)/)
      .map(patternPart)
      .join('')}$`,
  );
}

const cache = new Map<string, RegExp>();

function matches(pattern: string, path: string): boolean {
  let expression = cache.get(pattern);
  if (expression === undefined) {
    expression = patternToRegExp(pattern);
    cache.set(pattern, expression);
  }
  return expression.test(path);
}

export function isEditablePath(path: string, rules: EditableRules | undefined): boolean {
  if (rules === undefined) {
    return true;
  }
  if (typeof rules === 'function') {
    return rules(path);
  }

  const entries = Object.entries(rules);
  if (entries.some(([pattern, allowed]) => !allowed && matches(pattern, path))) {
    return false;
  }
  return entries.some(([pattern, allowed]) => allowed && matches(pattern, path));
}
