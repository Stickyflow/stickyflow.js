export type ShaderParameter = string | number | boolean;

export interface Shader {
  name: string;
  program: string;
  parameters: Record<string, ShaderParameter>;
}
