export type ShaderParameter = string | number | boolean;

export interface Shader {
  name: string;
  program: string;
  surfacePadding?: number;
  parameters: Record<string, ShaderParameter>;
}
