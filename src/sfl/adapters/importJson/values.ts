export const numOf = (value?: string): number | undefined =>
  value === undefined ? undefined : Number(value)

export function safeJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
