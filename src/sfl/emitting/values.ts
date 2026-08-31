import type { SflProperty, SflValue } from '../ast'

export function formatNumber(value: number): string {
  if (Object.is(value, -0)) return '0'
  return String(value)
}

function emitString(value: string): string {
  const escaped = value
    .replace(/\r\n?/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
  return `"${escaped}"`
}

export function emitValue(value: SflValue): string {
  switch (value.type) {
    case 'string': return emitString(value.value)
    case 'number': return formatNumber(value.value)
    case 'tuple': return value.values.map(formatNumber).join(', ')
    case 'list': return `[${value.values.map(emitValue).join(', ')}]`
    case 'ident': return value.segments.join('.')
    case 'endpoint': {
      let output = value.segments.join('.')
      if (value.side) {
        output += `, ${value.side}`
        if (value.fraction !== undefined) output += ` (${formatNumber(value.fraction)})`
      }
      return output
    }
  }
}

export const emitProperty = (property: SflProperty): string =>
  `${property.key}: ${emitValue(property.value)}`
