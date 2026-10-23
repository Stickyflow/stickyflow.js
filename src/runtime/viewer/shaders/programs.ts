import { buttonProgram } from './builtins/button';
import { chromaticGlassPlateProgram } from './builtins/chromaticGlassPlate';
import { chromaticHaloProgram } from './builtins/chromaticHalo';
import { eclipseOrbProgram } from './builtins/eclipseOrb';
import { emberMatrixProgram } from './builtins/emberMatrix';
import { emberSlitsProgram } from './builtins/emberSlits';
import { glassRefractionProgram } from './builtins/glassRefraction';
import { halftoneHaloProgram } from './builtins/halftoneHalo';
import { haloProgram } from './builtins/halo';
import { lumenPortalProgram } from './builtins/lumenPortal';
import { lumenPortalLightProgram } from './builtins/lumenPortalLight';
import { orbProgram } from './builtins/orb';
import { pixelConstellationProgram } from './builtins/pixelConstellation';
import { plasmaGaugeProgram } from './builtins/plasmaGauge';
import { prismSlatsProgram } from './builtins/prismSlats';
import { reactivePanelProgram } from './builtins/reactivePanel';
import { rulerProgram } from './builtins/ruler';
import { smearOrbProgram } from './builtins/smearOrb';
import { tickScaleProgram } from './builtins/tickScale';
import { violetGlassProgram } from './builtins/violetGlass';
import { violetGlassLightProgram } from './builtins/violetGlassLight';
import type { ShaderProgram } from './types';

const builtins = [
  orbProgram,
  haloProgram,
  halftoneHaloProgram,
  chromaticHaloProgram,
  chromaticGlassPlateProgram,
  glassRefractionProgram,
  emberSlitsProgram,
  smearOrbProgram,
  pixelConstellationProgram,
  plasmaGaugeProgram,
  tickScaleProgram,
  rulerProgram,
  buttonProgram,
  prismSlatsProgram,
  eclipseOrbProgram,
  emberMatrixProgram,
  violetGlassProgram,
  violetGlassLightProgram,
  lumenPortalProgram,
  lumenPortalLightProgram,
  reactivePanelProgram,
];
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
