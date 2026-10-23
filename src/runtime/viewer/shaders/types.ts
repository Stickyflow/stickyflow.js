import type { ShaderParameter } from '../../../model/shader';

export interface ShaderProgram {
  name: string;
  fragmentSource: string;
  defaultParameters?: Readonly<Record<string, ShaderParameter>>;
  usesBackdrop?: boolean;
  replacesBaseFill?: boolean;
}
