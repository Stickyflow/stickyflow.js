// src/features/sfl-language/sfl/adapters/decodeStyles.ts
//
// Kehrseite der Encoder in buildSflInput: SFL-Style-STRINGS zurück in die
// App-Modell-Objekte. Damit wird der Round-Trip auch für Gradienten, Mesh und
// Schatten verlustfrei (nicht nur strukturell).
//   • "gradient(45, #ff0000 0%, #0000ff 100%)" → { type:'gradient', angle, stops }
//   • "mesh(#ae3939 20,20, #4ECDC4 80,30)"     → { type:'mesh', points }
//   • "shadow(color:.., opacity:.., …)"        → { enabled:true, color, … }
//   • alles andere (Hex/rgba/Name)             → unverändert als String

// Erkennt eine einzelne Farbe (Hex, rgb/rgba mit inneren Kommas, oder Name).
const COLOR = String.raw`rgba?\([^)]*\)|#[0-9a-fA-F]+|[a-zA-Z][\w-]*`;

export interface GradientStop { position: number; color: string; }
export interface GradientFill { type: 'gradient'; angle: number; stops: GradientStop[]; }
export interface MeshPoint { id: string; x: number; y: number; color: string; }
export interface MeshFill { type: 'mesh'; points: MeshPoint[]; }
export interface PatternFill { type: 'pattern'; pattern: 'hachure' | 'cross-hatch' | 'dots'; color: string; spacing: number; strokeWidth: number; angle: 0 | 45 | 90 | 135; }
export type DecodedColor = string | GradientFill | MeshFill | PatternFill;

/** SFL-Farbstring → App-Farbe (String bleibt String; Gradient/Mesh → Objekt). */
export function decodeColor(s?: string): DecodedColor | undefined {
  if (s === undefined || s === null || s === '') return undefined;

  const grad = s.match(/^gradient\(\s*([-\d.]+)\s*,\s*(.*)\)\s*$/);
  if (grad) {
    const angle = Number(grad[1]);
    const stops: GradientStop[] = [];
    const re = new RegExp(`(${COLOR})\\s+([-\\d.]+)%`, 'g');
    for (const m of grad[2].matchAll(re)) stops.push({ color: m[1], position: Number(m[2]) });
    return { type: 'gradient', angle, stops };
  }

  const mesh = s.match(/^mesh\(\s*(.*)\)\s*$/);
  if (mesh) {
    const points: MeshPoint[] = [];
    const re = new RegExp(`(${COLOR})\\s+([-\\d.]+)\\s*,\\s*([-\\d.]+)`, 'g');
    let i = 0;
    for (const m of mesh[1].matchAll(re)) {
      points.push({ id: `mp-${Date.now()}-${i++}`, color: m[1], x: Number(m[2]), y: Number(m[3]) });
    }
    return { type: 'mesh', points };
  }

  const pattern = s.match(new RegExp(`^pattern\\(\\s*(hachure|cross-hatch|dots)\\s*,\\s*(${COLOR})\\s*,\\s*([-\\d.]+)\\s*,\\s*([-\\d.]+)\\s*,\\s*([-\\d.]+)\\s*\\)\\s*$`));
  if (pattern) {
    const angle = Number(pattern[5]);
    return {
      type: 'pattern',
      pattern: pattern[1] as PatternFill['pattern'],
      color: pattern[2],
      spacing: Number(pattern[3]),
      strokeWidth: Number(pattern[4]),
      angle: (angle === 0 || angle === 45 || angle === 90 || angle === 135) ? angle : 45,
    };
  }

  return s; // Hex / rgba / benannte Farbe → verbatim
}

export interface ShadowStyle {
  enabled: boolean;
  color?: string; opacity?: number; blur?: number; angle?: number; distance?: number;
}

/** SFL-Schattenstring → shadowStyle-Objekt. "on" = nur aktiviert. */
export function decodeShadow(s?: string): ShadowStyle | undefined {
  if (!s) return undefined;
  if (s === 'on') return { enabled: true };
  const m = s.match(/^shadow\((.*)\)\s*$/);
  if (!m) return undefined;
  const out: ShadowStyle = { enabled: true };
  for (const part of m[1].split(',')) {
    const kv = part.split(':');
    if (kv.length !== 2) continue;
    const key = kv[0].trim();
    const val = kv[1].trim();
    if (key === 'color') out.color = val;
    else if (key === 'opacity') out.opacity = Number(val);
    else if (key === 'blur') out.blur = Number(val);
    else if (key === 'angle') out.angle = Number(val);
    else if (key === 'distance') out.distance = Number(val);
  }
  return out;
}
