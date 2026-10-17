type Props = Record<string, string> | undefined;

// Values that SFL writes as strings; the rest are numbers or bare keywords.
const QUOTED_KEYS = new Set(['fill', 'stroke', 'textColor', 'fontFamily', 'shadow', 'labelBackground']);

function styleLine(key: string, value: string): string {
  return QUOTED_KEYS.has(key) ? `  ${key}: "${value.replace(/"/g, '\\"')}"` : `  ${key}: ${value}`;
}

// A `style { ... }` block that repeats the given properties of a resolved object. `leading` lines come first. Without any
// line there is nothing to copy and the result is undefined.
export function styleBlock(props: Props, keys: readonly string[], leading: readonly string[] = []): string | undefined {
  const copied = keys.flatMap(key => {
    const value = props?.[key];
    return value === undefined ? [] : [styleLine(key, value)];
  });
  const lines = [...leading, ...copied];
  return lines.length > 0 ? `style {\n${lines.join('\n')}\n}` : undefined;
}
