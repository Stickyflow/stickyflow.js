export const BAR_LABEL = { padX: 8, padY: 3, charWidth: 0.58, lineHeight: 1.2, gap: 4 } as const;

export interface BarLabelSize {
  width: number;
  height: number;
  lineHeight: number;
  padX: number;
  padY: number;
}

export function formatBarLabel(value: number, template: string | undefined): string {
  return (template || '{value}').replace('{value}', String(Math.round(value * 100) / 100));
}

export function barLabelSize(text: string, fontSize: number, pill: boolean): BarLabelSize {
  const padX = pill ? BAR_LABEL.padX : 0;
  const padY = pill ? BAR_LABEL.padY : 0;
  const lineHeight = fontSize * BAR_LABEL.lineHeight;
  return {
    width: text.length * fontSize * BAR_LABEL.charWidth + padX * 2,
    height: lineHeight + padY * 2,
    lineHeight,
    padX,
    padY,
  };
}

export function pillPath(x: number, y: number, width: number, height: number): string {
  const r = height / 2;
  return (
    `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
    `H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}
