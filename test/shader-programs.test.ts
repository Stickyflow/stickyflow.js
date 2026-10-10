import { describe, expect, it } from 'vitest';
import { registerShaderProgram } from '../src/runtime/viewer';
import { shaderProgram } from '../src/runtime/viewer/shaders/programs';

describe('shader programs', () => {
  it('ships every built-in shader program', () => {
    expect(shaderProgram('orb')?.fragmentSource).toContain('void main()');
    expect(shaderProgram('halo')?.fragmentSource).toContain('uThickness');
    expect(shaderProgram('particleSphere')?.fragmentSource).toContain('uDensity');
    expect(shaderProgram('particleSphere')?.fragmentSource).toContain('uBottomColor');
    expect(shaderProgram('particleSphere')?.fragmentSource).toContain('uTopColor');
    expect(shaderProgram('particleSphere')?.fragmentSource).toContain('rotateY');
    expect(shaderProgram('waveSphere')).toMatchObject({
      name: 'waveSphere',
      fragmentSource: expect.stringContaining('void main()'),
    });
  });

  it('allows a host to register and unregister its own program', () => {
    const custom = { name: 'custom-test', fragmentSource: 'void main() {}' };
    const unregister = registerShaderProgram(custom);

    expect(shaderProgram('custom-test')).toBe(custom);
    unregister();
    expect(shaderProgram('custom-test')).toBeUndefined();
  });
});
