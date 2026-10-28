export interface SflSwimlaneData {
  orientation: 'horizontal' | 'vertical';
  lanes: Array<{ id: string; label: string; size: number; color?: string }>;
}
