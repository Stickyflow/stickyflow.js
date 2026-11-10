// One frame of a path traced picture: for each pixel one path of light, followed backwards from the eye through the scene. Many
// frames added up give the picture. The scene comes as textures of numbers: a tree of boxes, the triangles and the materials.

const DATA = `
uniform sampler2D uNodes;
uniform sampler2D uTriangles;
uniform sampler2D uMaterials;
uniform sampler2DArray uColorMaps;
uniform sampler2DArray uDataMaps;

// The rows of numbers are 2048 wide.
vec4 fetch(sampler2D data, int index) {
  return texelFetch(data, ivec2(index & 2047, index >> 11), 0);
}`;

const RANDOM = `
uint seed;
float random() {
  seed = seed * 747796405u + 2891336453u;
  uint word = ((seed >> ((seed >> 28u) + 4u)) ^ seed) * 277803737u;
  return float(((word >> 22u) ^ word) >> 8u) / 16777216.0;
}`;

const RAYS = `
struct Hit {
  float distance;
  int triangle;
  vec2 at;
};

bool meetsBox(vec3 origin, vec3 slope, vec3 least, vec3 greatest, float reach) {
  vec3 a = (least - origin) * slope;
  vec3 b = (greatest - origin) * slope;
  vec3 low = min(a, b);
  vec3 high = max(a, b);
  float near = max(max(low.x, low.y), low.z);
  float far = min(min(high.x, high.y), high.z);
  return far >= max(near, 0.0) && near < reach;
}

// Where a ray meets a triangle, as its distance and the place on the triangle, or a distance below zero.
float meetsTriangle(vec3 origin, vec3 direction, vec3 a, vec3 b, vec3 c, out vec2 at) {
  vec3 ab = b - a;
  vec3 ac = c - a;
  vec3 p = cross(direction, ac);
  float det = dot(ab, p);
  if (abs(det) < 1e-12) {
    return -1.0;
  }
  vec3 from = origin - a;
  float u = dot(from, p) / det;
  vec3 q = cross(from, ab);
  float v = dot(direction, q) / det;
  if (u < 0.0 || v < 0.0 || u + v > 1.0) {
    return -1.0;
  }
  at = vec2(u, v);
  return dot(ac, q) / det;
}

// The nearest triangle a ray meets within its reach. With 'anyOne', the first one found is enough, as for a shadow.
bool trace(vec3 origin, vec3 direction, float reach, bool anyOne, out Hit hit) {
  vec3 slope = 1.0 / (direction + vec3(equal(direction, vec3(0.0))) * 1e-20);
  int stack[32];
  int height = 0;
  int node = 0;
  hit.distance = reach;
  hit.triangle = -1;
  for (int visit = 0; visit < 2048; visit++) {
    vec4 low = fetch(uNodes, node * 2);
    vec4 high = fetch(uNodes, node * 2 + 1);
    bool descend = false;
    if (meetsBox(origin, slope, low.xyz, high.xyz, hit.distance)) {
      int count = int(high.w);
      if (count == 0) {
        if (height < 32) {
          stack[height++] = int(low.w);
        }
        node++;
        descend = true;
      } else {
        int first = int(low.w);
        for (int i = first; i < first + count; i++) {
          vec2 at;
          float distance = meetsTriangle(
            origin, direction, fetch(uTriangles, i * 7).xyz, fetch(uTriangles, i * 7 + 1).xyz, fetch(uTriangles, i * 7 + 2).xyz, at);
          if (distance > 0.0 && distance < hit.distance) {
            hit.distance = distance;
            hit.triangle = i;
            hit.at = at;
            if (anyOne) {
              return true;
            }
          }
        }
      }
    }
    if (!descend) {
      if (height == 0) {
        break;
      }
      node = stack[--height];
    }
  }
  return hit.triangle >= 0;
}

bool blocked(vec3 origin, vec3 direction) {
  Hit hit;
  return trace(origin, direction, 1e30, true, hit);
}`;

const SURFACE = `
struct Surface {
  vec3 position;
  // The way the surface faces, as its shape says and as its normals and its normal map say, both toward the eye.
  vec3 face;
  vec3 normal;
  vec3 color;
  float metallic;
  float roughness;
  vec3 emissive;
};

Surface surfaceOf(Hit hit, vec3 origin, vec3 direction) {
  int t = hit.triangle * 7;
  vec4 a = fetch(uTriangles, t);
  vec4 b = fetch(uTriangles, t + 1);
  vec4 c = fetch(uTriangles, t + 2);
  vec4 na = fetch(uTriangles, t + 3);
  vec4 nb = fetch(uTriangles, t + 4);
  vec4 nc = fetch(uTriangles, t + 5);
  vec2 uvA = vec2(b.w, c.w);
  vec2 uvB = vec2(na.w, nb.w);
  vec2 uvC = vec2(nc.w, fetch(uTriangles, t + 6).x);
  float w = 1.0 - hit.at.x - hit.at.y;
  vec2 uv = uvA * w + uvB * hit.at.x + uvC * hit.at.y;
  int m = int(a.w) * 3;
  vec4 base = fetch(uMaterials, m);
  vec4 look = fetch(uMaterials, m + 1);
  vec4 glow = fetch(uMaterials, m + 2);
  int maps = int(glow.w);
  float layer = look.z * 2.0;

  Surface s;
  s.position = origin + direction * hit.distance;
  vec3 ab = b.xyz - a.xyz;
  vec3 ac = c.xyz - a.xyz;
  s.face = normalize(cross(ab, ac));
  s.normal = normalize(na.xyz * w + nb.xyz * hit.at.x + nc.xyz * hit.at.y);
  if (dot(s.face, direction) > 0.0) {
    s.face = -s.face;
  }
  if (dot(s.normal, s.face) < 0.0) {
    s.normal = -s.normal;
  }
  if ((maps & 4) != 0) {
    // The directions in which u and v grow on the triangle carry the normal map onto it.
    vec2 uvAB = uvB - uvA;
    vec2 uvAC = uvC - uvA;
    float det = uvAB.x * uvAC.y - uvAB.y * uvAC.x;
    if (abs(det) > 1e-12) {
      vec3 along = (ab * uvAC.y - ac * uvAB.y) / det;
      vec3 across = (ac * uvAB.x - ab * uvAC.x) / det;
      along = normalize(along - s.normal * dot(along, s.normal));
      across = normalize(across - s.normal * dot(across, s.normal));
      vec3 bump = textureLod(uDataMaps, vec3(uv, layer + 1.0), 0.0).xyz * 2.0 - 1.0;
      bump.xy *= look.w;
      vec3 bent = normalize(along * bump.x + across * bump.y + s.normal * bump.z);
      s.normal = dot(bent, s.face) > 0.0 ? bent : s.normal;
    }
  }
  s.color = base.rgb * ((maps & 1) != 0 ? textureLod(uColorMaps, vec3(uv, layer), 0.0).rgb : vec3(1.0));
  vec2 surface = (maps & 2) != 0 ? textureLod(uDataMaps, vec3(uv, layer), 0.0).gb : vec2(1.0);
  s.roughness = clamp(look.y * surface.x, 0.04, 1.0);
  s.metallic = clamp(look.x * surface.y, 0.0, 1.0);
  s.emissive = glow.rgb * ((maps & 8) != 0 ? textureLod(uColorMaps, vec3(uv, layer + 1.0), 0.0).rgb : vec3(1.0));
  return s;
}`;

const MATERIAL = `
const float PI = 3.14159265;

// How much of the light from 'l' a surface sends toward 'v', and how likely the tracer is to pick 'l' when it follows the surface.
vec3 reflectance(Surface s, vec3 v, vec3 l, out float chance) {
  vec3 n = s.normal;
  float nl = dot(n, l);
  float nv = max(dot(n, v), 0.001);
  chance = 0.0;
  if (nl <= 0.0) {
    return vec3(0.0);
  }
  vec3 h = normalize(v + l);
  float nh = max(dot(n, h), 0.0);
  float vh = max(dot(v, h), 0.001);
  float a = s.roughness * s.roughness;
  float a2 = a * a;
  float d = a2 / max(PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0), 1e-6);
  float k = pow(s.roughness + 1.0, 2.0) / 8.0;
  float g = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  vec3 f0 = mix(vec3(0.04), s.color, s.metallic);
  vec3 f = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
  float mirror = 0.5 + 0.5 * s.metallic;
  chance = mirror * d * nh / (4.0 * vh) + (1.0 - mirror) * nl / PI;
  return (1.0 - f) * (1.0 - s.metallic) * s.color / PI + d * g * f / max(4.0 * nv * nl, 0.001);
}

// A direction to follow from a surface: around its mirror direction, as wide as it is rough, or anywhere over it.
vec3 follow(Surface s, vec3 v) {
  vec3 n = s.normal;
  vec3 helper = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(helper, n));
  vec3 b = cross(n, t);
  float u1 = random();
  float u2 = random();
  float phi = 2.0 * PI * u1;
  if (random() < 0.5 + 0.5 * s.metallic) {
    float a = s.roughness * s.roughness;
    float cosTheta = sqrt((1.0 - u2) / (1.0 + (a * a - 1.0) * u2));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
    vec3 h = t * cos(phi) * sinTheta + b * sin(phi) * sinTheta + n * cosTheta;
    return reflect(-v, h);
  }
  float r = sqrt(u2);
  return normalize(t * cos(phi) * r + b * sin(phi) * r + n * sqrt(max(0.0, 1.0 - u2)));
}`;

const LIGHTS = `
uniform sampler2D uEnvironment;
uniform vec2 uEnvironmentTurn;
uniform float uEnvironmentStrength;
// The smaller copy of the environment that the lights of the frames are picked from, and all its light added up.
uniform float uSkyLevel;
uniform float uSkyTotal;
// The light of the environment that this frame shows: where it is, and its light over how likely it was to be picked.
uniform vec3 uEnvDirection;
uniform vec3 uEnvLight;
uniform vec3 uSunDirection;
uniform vec3 uSun;
uniform float uSunSize;
uniform bool uSunShadows;

vec2 equirect(vec3 d) {
  d = vec3(uEnvironmentTurn.x * d.x - uEnvironmentTurn.y * d.z, d.y, uEnvironmentTurn.y * d.x + uEnvironmentTurn.x * d.z);
  return vec2(atan(d.x, -d.z) / (2.0 * PI) + 0.5, acos(clamp(d.y, -1.0, 1.0)) / PI);
}

vec3 environment(vec3 direction) {
  return textureLod(uEnvironment, equirect(direction), 0.0).rgb * uEnvironmentStrength;
}

// About how likely a direction is to be picked as the light of a frame. The same measure weighs both ways of finding the
// light of the environment against each other, so together they count it once.
float skyChance(vec3 direction) {
  if (direction.y <= 0.02) {
    return 0.0;
  }
  vec3 light = textureLod(uEnvironment, equirect(direction), uSkyLevel).rgb;
  return dot(light, vec3(0.2126, 0.7152, 0.0722)) / uSkyTotal;
}

// The light that reaches a surface straight from the light of this frame and from the sun.
vec3 direct(Surface s, vec3 v, float lift) {
  vec3 from = s.position + s.face * lift;
  vec3 light = vec3(0.0);
  float chance;
  vec3 back = reflectance(s, v, uEnvDirection, chance);
  if (chance > 0.0 && !blocked(from, uEnvDirection)) {
    float sky = skyChance(uEnvDirection);
    float weight = sky > 0.0 ? sky * sky / (sky * sky + chance * chance) : 1.0;
    light += back * dot(s.normal, uEnvDirection) * uEnvLight * weight;
  }
  if (uSun.r + uSun.g + uSun.b > 0.0) {
    // A sun with a size is a disc of directions, which softens the edges of its shadows.
    float angle = random() * 2.0 * PI;
    float radius = sqrt(random()) * uSunSize;
    vec3 side = normalize(cross(uSunDirection, abs(uSunDirection.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 toSun = normalize(uSunDirection + (side * cos(angle) + cross(uSunDirection, side) * sin(angle)) * radius);
    back = reflectance(s, v, toSun, chance);
    if (chance > 0.0 && !(uSunShadows && blocked(from, toSun))) {
      light += back * dot(s.normal, toSun) * uSun;
    }
  }
  return light;
}`;

const GROUND = `
uniform float uFloor;
// How much of what stands on it the ground reflects, and the color it throws light back with.
uniform float uReflection;
uniform vec3 uGroundColor;
// The shadows on the ground as the page shows them: what the shadow of the light of this frame counts for, how dark the shadow
// of the sun is, around which point they lie and how far they reach.
uniform float uEnvGround;
uniform float uSunGround;
uniform vec3 uCenter;
uniform float uFade;
uniform mat4 uStage;

float groundShadow(vec3 at, float lift) {
  float distance = length(at.xz - uCenter.xz);
  vec4 seen = uStage * vec4(at, 1.0);
  vec2 edge = seen.w > 0.0 ? abs(seen.xy / seen.w) : vec2(1.0);
  float inside = (1.0 - smoothstep(0.7, 0.97, edge.x)) * (1.0 - smoothstep(0.7, 0.97, edge.y));
  float near = 1.0 - smoothstep(uFade * 0.25, uFade * 0.7, distance);
  vec3 from = at + vec3(0.0, lift, 0.0);
  float shadow = 0.0;
  if (uSunGround > 0.0 && blocked(from, uSunDirection)) {
    shadow = uSunGround * (1.0 - smoothstep(uFade * 0.6, uFade, distance));
  }
  if (uEnvGround > 0.0 && near * inside > 0.0 && blocked(from, uEnvDirection)) {
    shadow = 1.0 - (1.0 - shadow) * (1.0 - uEnvGround * 0.92 * near * inside);
  }
  return shadow;
}`;

export const TRACE_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
in vec2 vUv;
uniform mat4 uInverse;
uniform vec3 uEye;
uniform float uSeed;
uniform float uExposure;
// A small step off a surface, so a ray that starts on it does not meet it again.
uniform float uLift;
out vec4 fragment;
${DATA}
${RANDOM}
${RAYS}
${SURFACE}
${MATERIAL}
${LIGHTS}
${GROUND}

void main() {
  seed = (uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(uSeed) * 26699u) | 1u;
  random();
  vec4 far = uInverse * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 origin = uEye;
  vec3 direction = normalize(far.xyz / far.w - uEye);
  vec3 light = vec3(0.0);
  vec3 through = vec3(1.0);
  // What the pixel shows of the scene: nothing, the scene itself, or as much of it as the ground reflects.
  float cover = 0.0;
  float reflected = 1.0;
  float shadow = 0.0;
  // Whether the path has only seen through the eye so far, and how likely its last turn was.
  bool seeing = true;
  float chance = 0.0;
  for (int bounce = 0; bounce < 5; bounce++) {
    Hit hit;
    bool found = trace(origin, direction, 1e30, false, hit);
    float toGround = direction.y < 0.0 && origin.y > uFloor ? (uFloor - origin.y) / direction.y : -1.0;
    Surface s;
    if (toGround > 0.0 && (!found || toGround < hit.distance)) {
      vec3 at = origin + direction * toGround;
      if (seeing) {
        // The ground as the eye sees it: the page with its shadows, and what the ground reflects.
        if (bounce == 0) {
          shadow = groundShadow(at, uLift);
        }
        if (uReflection <= 0.0 || bounce > 0) {
          break;
        }
        reflected = uReflection;
        origin = at + vec3(0.0, uLift, 0.0);
        direction = reflect(direction, vec3(0.0, 1.0, 0.0));
        continue;
      }
      // The ground as light finds it on its way: a matte surface that throws light back.
      s.position = at;
      s.face = vec3(0.0, 1.0, 0.0);
      s.normal = s.face;
      s.color = uGroundColor;
      s.metallic = 0.0;
      s.roughness = 1.0;
      s.emissive = vec3(0.0);
    } else if (!found) {
      if (!seeing) {
        float sky = skyChance(direction);
        light += through * environment(direction) * (chance * chance / (chance * chance + sky * sky));
      }
      break;
    } else {
      s = surfaceOf(hit, origin, direction);
    }
    if (seeing) {
      cover = reflected;
      seeing = false;
    }
    vec3 v = -direction;
    light += through * (s.emissive + direct(s, v, uLift));
    vec3 next = follow(s, v);
    vec3 back = reflectance(s, v, next, chance);
    if (chance <= 0.0 || dot(next, s.face) <= 0.0) {
      break;
    }
    through *= back * dot(s.normal, next) / chance;
    if (bounce >= 2) {
      // Paths that carry little light are ended by chance, and the rest count for more.
      float keep = clamp(max(through.r, max(through.g, through.b)), 0.05, 1.0);
      if (random() > keep) {
        break;
      }
      through /= keep;
    }
    origin = s.position + s.face * uLift;
    direction = next;
  }
  // One bright path would stay as a speck for a long time, so no path counts for more than this.
  light = min(light, vec3(24.0)) * uExposure;
  fragment = vec4(light * cover * (1.0 - shadow), shadow + cover * (1.0 - shadow));
}`;
