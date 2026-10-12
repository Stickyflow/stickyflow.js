export interface ShaderProgram {
  name: string;
  fragmentSource: string;
  usesBackdrop?: boolean;
  replacesBaseFill?: boolean;
}
