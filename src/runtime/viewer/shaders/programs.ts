export interface ShaderProgram {
  name: string;
  fragmentSource: string;
}

const ORB_FRAGMENT = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uIntensity;
uniform float uSpeed;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius > 1.0) discard;

  float angle = atan(p.y, p.x);
  float time = uTime * max(uSpeed, 0.0);
  float fold = sin(angle * 3.0 - time * 1.7 + radius * 7.0);
  float ribbon = exp(-pow(radius - (0.69 + fold * 0.07), 2.0) * 95.0);
  float rim = smoothstep(0.58, 0.98, radius) * (1.0 - smoothstep(0.94, 1.0, radius));
  float light = exp(-length(p - vec2(-0.42, -0.34)) * 4.2);
  float grain = (hash(gl_FragCoord.xy + time) - 0.5) * 0.035;
  float energy = clamp((ribbon * 0.8 + rim * 0.55 + light * 0.7) * uIntensity, 0.0, 1.0);
  vec3 color = mix(uColor * (0.12 + 0.32 * (1.0 - radius)), uAccent, energy);
  color += grain;
  float alpha = 1.0 - smoothstep(0.94, 1.0, radius);
  gl_FragColor = vec4(color, alpha);
}
`;

const programs = new Map<string, ShaderProgram>([['orb', { name: 'orb', fragmentSource: ORB_FRAGMENT }]]);

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
