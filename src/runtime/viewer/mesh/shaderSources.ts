export const VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormal;
uniform mat4 uLight;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vShadow;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = uNormal * aNormal;
  vUv = aUv;
  vShadow = uLight * world;
  gl_Position = uViewProjection * world;
}`;

const SHADOW_LOOKUP = `
uniform highp sampler2DShadow uShadow;
in vec4 vShadow;
float lit() {
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  float sum = 0.0;
  vec2 step = 1.0 / vec2(textureSize(uShadow, 0));
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      sum += texture(uShadow, vec3(p.xy + vec2(x, y) * step, p.z - 0.0015));
    }
  }
  return sum / 25.0;
}`;

export const FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec4 uBase;
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uEye;
uniform bool uHasTexture;
uniform sampler2D uTexture;
out vec4 fragment;
${SHADOW_LOOKUP}
const float PI = 3.14159265;
const vec3 KEY = vec3(0.55, 0.75, 0.35);
const vec3 FILL = vec3(-0.6, 0.3, 0.7);

// A room worked out from a direction: a bright sky, a dark floor and one soft window, blurrier the rougher the surface is.
vec3 room(vec3 d, float roughness) {
  float blur = 0.08 + roughness * 0.6;
  vec3 color = mix(vec3(0.16, 0.15, 0.14), vec3(0.78, 0.82, 0.9), smoothstep(-blur, blur, d.y));
  float window = pow(max(dot(d, normalize(KEY)), 0.0), mix(160.0, 3.0, roughness));
  return color + vec3(1.0, 0.97, 0.92) * window * mix(3.0, 0.25, roughness);
}

vec3 light(vec3 n, vec3 v, vec3 l, vec3 radiance, vec3 albedo, vec3 f0, float roughness, float metallic) {
  vec3 h = normalize(v + l);
  float nl = max(dot(n, l), 0.0);
  float nv = max(dot(n, v), 0.001);
  float nh = max(dot(n, h), 0.0);
  float a = roughness * roughness;
  float a2 = a * a;
  float d = a2 / max(PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0), 0.0001);
  float k = pow(roughness + 1.0, 2.0) / 8.0;
  float g = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  vec3 f = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
  vec3 specular = d * g * f / max(4.0 * nv * nl, 0.001);
  vec3 diffuse = (1.0 - f) * (1.0 - metallic) * albedo / PI;
  return (diffuse + specular) * radiance * nl;
}

void main() {
  vec4 base = uBase;
  if (uHasTexture) {
    base *= texture(uTexture, vUv);
  }
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) {
    n = -n;
  }
  float roughness = clamp(uRoughness, 0.04, 1.0);
  float metallic = clamp(uMetallic, 0.0, 1.0);
  vec3 f0 = mix(vec3(0.04), base.rgb, metallic);
  float nv = max(dot(n, v), 0.001);
  vec3 color = light(n, v, normalize(KEY), vec3(2.8), base.rgb, f0, roughness, metallic) * lit();
  color += light(n, v, normalize(FILL), vec3(0.5), base.rgb, f0, roughness, metallic);
  // What the room gives, by a short form of the usual table of how a rough surface reflects.
  vec4 r = roughness * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a004 = min(r.x * r.x, pow(2.0, -9.28 * nv)) * r.x + r.y;
  vec2 ab = vec2(-1.04, 1.04) * a004 + r.zw;
  vec3 fresnel = f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(1.0 - nv, 5.0);
  color += room(reflect(-v, n), roughness) * (fresnel * ab.x + ab.y);
  color += room(n, 1.0) * base.rgb * (1.0 - metallic) * 0.55;
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 2.2));
  fragment = vec4(color * base.a, base.a);
}`;

export const DEPTH_FRAGMENT = `#version 300 es
precision highp float;
void main() {}`;

// What lies under a pixel: which mesh in two channels, and how far away in two more.
export const PROBE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uEye;
uniform float uRange;
uniform vec2 uId;
out vec4 fragment;
void main() {
  float far = clamp(length(vWorld - uEye) / uRange, 0.0, 1.0) * 65535.0;
  fragment = vec4(uId, floor(far / 256.0) / 255.0, mod(floor(far), 256.0) / 255.0);
}`;

// Only the shadow is drawn, so the page stays visible where there is none.
export const GROUND_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCenter;
uniform float uFade;
out vec4 fragment;
${SHADOW_LOOKUP}
void main() {
  float fade = 1.0 - smoothstep(uFade * 0.6, uFade, length(vWorld.xz - uCenter.xz));
  fragment = vec4(0.0, 0.0, 0.0, (1.0 - lit()) * 0.32 * fade);
}`;

export const PLANE_VERTEX = `attribute vec2 aPosition;
uniform mat4 uMvp;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = uMvp * vec4(aPosition, 0.0, 1.0);
}`;

export const PLANE_FRAGMENT = `precision highp float;
uniform sampler2D uPicture;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uPicture, vUv);
  if (color.a < 0.004) {
    discard;
  }
  gl_FragColor = color;
}`;
