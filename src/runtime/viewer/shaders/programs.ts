import { eclipseOrbProgram } from './builtins/eclipseOrb';
import { haloProgram } from './builtins/halo';
import { orbProgram } from './builtins/orb';
import { particleSphereProgram } from './builtins/particleSphere';
import type { ShaderProgram } from './types';

const builtins = [orbProgram, haloProgram, particleSphereProgram, eclipseOrbProgram];
const programs = new Map<string, ShaderProgram>(builtins.map(program => [program.name, program]));

export function registerShaderProgram(program: ShaderProgram): () => void {
  if (!program.name.trim()) {
    throw new Error('registerShaderProgram: name must not be empty.');
  }
  if (!program.fragmentSource.includes('void main')) {
    throw new Error(`registerShaderProgram: "${program.name}" has no main function.`);
  }
  programs.set(program.name, program);
  return () => {
    if (programs.get(program.name) === program) {
      programs.delete(program.name);
    }
  };
}

export function shaderProgram(name: string): ShaderProgram | undefined {
  return programs.get(name);
}
