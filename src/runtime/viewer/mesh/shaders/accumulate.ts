import { TONE_CURVE } from './chunks';

// A frame of a still picture, added to the sum of the frames before it.
export const ADD_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uFrame;
out vec4 fragment;
void main() {
  fragment = texture(uFrame, vUv);
}`;

// The sum of the frames, shown as their mean: light, turned into what a screen shows. A traced picture is grainy until it has
// very many frames, so its light is smoothed here: each pixel takes the mean of the pixels around it that show the same surface,
// facing the same way, in about the same light. The color of the surface is taken out first and put back after, so its picture
// stays sharp, and what is glossy or glows is left as it is, as its reflections are not grain.
export const SHOW_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSum;
uniform sampler2D uGuide;
uniform sampler2D uLook;
uniform bool uGuided;
uniform float uCount;
uniform sampler2D uOver;
uniform bool uHasOver;
out vec4 fragment;
${TONE_CURVE}

const int REACH = 3;

float brightness(vec3 light) {
  return dot(light, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  ivec2 here = ivec2(gl_FragCoord.xy);
  vec4 mean = texelFetch(uSum, here, 0) / uCount;
  if (uGuided) {
    vec4 guide = texelFetch(uGuide, here, 0);
    vec4 look = texelFetch(uLook, here, 0);
    bool surface = guide.a > 0.0;
    // The light of a surface without its color, or the plain picture where no surface was seen: the shadows on the page.
    vec3 tint = surface ? max(look.rgb, vec3(0.02)) : vec3(1.0);
    vec4 own = vec4(mean.rgb / tint, mean.a);
    float ownLight = brightness(own.rgb);
    vec4 sum = vec4(0.0);
    float weights = 0.0;
    ivec2 size = textureSize(uSum, 0);
    // A sum of few frames is grainy, so it is smoothed over a wider reach and with less regard for steps in its light, which are
    // mostly grain then. As frames are added this narrows to the fine smoothing of the finished picture.
    float early = 1.0 - smoothstep(64.0, 192.0, uCount);
    int stride = early > 0.35 ? 2 : 1;
    for (int x = -REACH; x <= REACH; x++) {
      for (int y = -REACH; y <= REACH; y++) {
        ivec2 at = clamp(here + ivec2(x, y) * stride, ivec2(0), size - 1);
        vec4 otherGuide = texelFetch(uGuide, at, 0);
        if ((otherGuide.a > 0.0) != surface) {
          continue;
        }
        vec4 other = texelFetch(uSum, at, 0) / uCount;
        float weight = exp(-float(x * x + y * y) / 8.0);
        if (surface) {
          other.rgb /= max(texelFetch(uLook, at, 0).rgb, vec3(0.02));
          weight *= pow(max(dot(guide.xyz, otherGuide.xyz), 0.0), 48.0);
          weight *= exp(-abs(guide.a - otherGuide.a) / (guide.a * 0.02));
        }
        // An edge in the light itself, as of a shadow, is kept.
        weight *= exp(-abs(brightness(other.rgb) - ownLight) / ((ownLight * 0.3 + 0.02) * (1.0 + early * 5.0)));
        sum += other * weight;
        weights += weight;
      }
    }
    vec4 smoothed = weights > 0.0 ? sum / weights : own;
    // How much of the smoothing a pixel takes: all of it where the surface is matte, none where it is glossy.
    float matte = surface ? smoothstep(0.2, 0.55, look.a) : 1.0;
    mean = vec4(mix(own.rgb, smoothed.rgb, matte) * tint, surface ? mean.a : mix(own.a, smoothed.a, matte));
  }
  float alpha = min(mean.a, 1.0);
  fragment = mean.a <= 0.0 ? vec4(0.0) : vec4(toScreen(mean.rgb / mean.a) * alpha, alpha);
  if (uHasOver) {
    vec4 over = texelFetch(uOver, here, 0);
    fragment = over + fragment * (1.0 - over.a);
  }
}`;
