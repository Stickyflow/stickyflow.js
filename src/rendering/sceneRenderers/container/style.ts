import type { SceneStyle } from '../../renderScene';

export function simpleContainerStyle(fill: string, stroke: string, strokeWidth: number, dash?: number[]): SceneStyle {
  return {
    fill: { kind: 'solid', color: fill || 'transparent' },
    stroke: { kind: 'solid', color: stroke },
    strokeWidth,
    dash: dash?.length ? dash : undefined,
  };
}
