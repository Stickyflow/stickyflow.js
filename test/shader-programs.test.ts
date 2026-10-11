import { describe, expect, it } from 'vitest';
import { registerShaderProgram } from '../src/runtime/viewer';
import { shaderProgram } from '../src/runtime/viewer/shaders/programs';

describe('shader programs', () => {
  it('ships every built-in shader program', () => {
    expect(shaderProgram('orb')?.fragmentSource).toContain('void main()');
    expect(shaderProgram('halo')?.fragmentSource).toContain('uThickness');
    expect(shaderProgram('halo')?.fragmentSource).toContain('uProgress');
    expect(shaderProgram('halo')?.fragmentSource).toContain('uBoost');
    expect(shaderProgram('halftoneHalo')?.fragmentSource).toContain('uDotCount');
    expect(shaderProgram('halftoneHalo')?.fragmentSource).toContain('uRingRadius');
    expect(shaderProgram('chromaticHalo')?.fragmentSource).toContain('uBloom');
    expect(shaderProgram('glassRefraction')).toMatchObject({
      usesBackdrop: true,
      fragmentSource: expect.stringContaining('uBackdrop'),
    });
    expect(shaderProgram('eclipseOrb')).toMatchObject({
      name: 'eclipseOrb',
      fragmentSource: expect.stringContaining('void main()'),
    });
    expect(shaderProgram('liquidLens')).toBeUndefined();
    for (const name of [
      'violetGlass',
      'violetGlassLight',
      'lumenPortal',
      'lumenPortalLight',
      'prismSlats',
      'emberMatrix',
      'pixelConstellation',
    ]) {
      expect(shaderProgram(name)).toMatchObject({
        name,
        fragmentSource: expect.stringContaining('void main()'),
      });
    }
  });

  it('allows a host to register and unregister its own program', () => {
    const custom = { name: 'custom-test', fragmentSource: 'void main() {}' };
    const unregister = registerShaderProgram(custom);

    expect(shaderProgram('custom-test')).toBe(custom);
    unregister();
    expect(shaderProgram('custom-test')).toBeUndefined();
  });
});
