import { TONE_CURVE } from '../shaders/chunks';

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
// Whether anything in the scene is partly see-through, which makes shadows cost more.
uniform bool uSeeThrough;

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

// Whether something stands between a point and a light. What is partly see-through lets that part of the rays pass, so over
// many frames it throws a lighter shadow.
bool blocked(vec3 origin, vec3 direction) {
  Hit hit;
  if (!uSeeThrough) {
    return trace(origin, direction, 1e30, true, hit);
  }
  for (int layer = 0; layer < 6; layer++) {
    if (!trace(origin, direction, 1e30, false, hit)) {
      return false;
    }
    int material = int(fetch(uTriangles, hit.triangle * 7).w) * 4;
    // Glass lets most of the light through. It does not bend it here, so its shadow is only lighter, without bright spots.
    float opacity = fetch(uMaterials, material).a * (1.0 - 0.9 * fetch(uMaterials, material + 3).x);
    if (random() < opacity) {
      return true;
    }
    origin += direction * (hit.distance + uLift);
  }
  return true;
}`;

const SURFACE = `
struct Surface {
  vec3 position;
  // The way the surface faces, as its shape says and as its normals and its normal map say, both toward the eye.
  vec3 face;
  vec3 normal;
  vec3 color;
  // How much of the light that meets the surface it takes: the rest passes straight through.
  float opacity;
  float metallic;
  float roughness;
  vec3 emissive;
  // How much of the light goes into the material, as in glass, how strongly it bends there, and whether the ray comes from outside.
  float transmission;
  float ior;
  bool entering;
  // A drawing that is shown as it is: it takes no light and throws none back.
  bool unlit;
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
  int m = int(a.w) * 4;
  vec4 base = fetch(uMaterials, m);
  vec4 look = fetch(uMaterials, m + 1);
  vec4 glow = fetch(uMaterials, m + 2);
  vec4 glass = fetch(uMaterials, m + 3);
  int maps = int(glow.w);
  float layer = look.z * 2.0;

  Surface s;
  s.position = origin + direction * hit.distance;
  vec3 ab = b.xyz - a.xyz;
  vec3 ac = c.xyz - a.xyz;
  s.face = normalize(cross(ab, ac));
  s.normal = normalize(na.xyz * w + nb.xyz * hit.at.x + nc.xyz * hit.at.y);
  // The normals of a mesh point out of it, so a ray against them comes from outside.
  s.entering = dot(s.normal, direction) < 0.0;
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
  vec4 picture = (maps & 1) != 0 ? textureLod(uColorMaps, vec3(uv, layer), 0.0) : vec4(1.0);
  s.color = base.rgb * picture.rgb;
  s.opacity = base.a < 1.0 ? base.a * picture.a : 1.0;
  vec2 surface = (maps & 2) != 0 ? textureLod(uDataMaps, vec3(uv, layer), 0.0).gb : vec2(1.0);
  s.roughness = clamp(look.y * surface.x, 0.04, 1.0);
  s.metallic = clamp(look.x * surface.y, 0.0, 1.0);
  s.emissive = glow.rgb * ((maps & 8) != 0 ? textureLod(uColorMaps, vec3(uv, layer + 1.0), 0.0).rgb : vec3(1.0));
  s.transmission = glass.x * (1.0 - s.metallic);
  s.ior = max(glass.y, 1.0);
  s.unlit = (maps & 16) != 0;
  if (s.unlit) {
    // The drawing holds the colors of the screen. They are put among light so that they come out as they went in.
    vec4 drawing = textureLod(uDataMaps, vec3(uv, layer), 0.0);
    s.opacity = drawing.a;
    s.color = vec3(0.0);
    s.emissive = drawing.a > 0.0 ? fromScreen(drawing.rgb / drawing.a) / uExposure : vec3(0.0);
  }
  return s;
}`;

const MATERIAL = `
const float PI = 3.14159265;

// A rough surface is many small mirrors that lean a little, each its own way: this is the way one of them faces.
vec3 leaning(vec3 n, float roughness) {
  vec3 helper = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(helper, n));
  vec3 b = cross(n, t);
  float a = roughness * roughness;
  float phi = 2.0 * PI * random();
  float pick = random();
  float cosTheta = sqrt((1.0 - pick) / (1.0 + (a * a - 1.0) * pick));
  float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
  return t * cos(phi) * sinTheta + b * sin(phi) * sinTheta + n * cosTheta;
}

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

// A direction close to another one, for each pixel its own. A frame has one light of the environment, so its shadow has
// a hard edge, and the frames together showed the edges of all of them as bands. Spread a little, they run into each other.
const float ENV_SPREAD = 0.14;
vec3 spreadFrom(vec3 d) {
  float angle = random() * 2.0 * PI;
  float radius = sqrt(random()) * ENV_SPREAD;
  vec3 side = normalize(cross(d, abs(d.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 turned = normalize(d + (side * cos(angle) + cross(d, side) * sin(angle)) * radius);
  return turned.y > 0.02 ? turned : d;
}

// The light that reaches a surface straight from the light of this frame and from the sun.
vec3 direct(Surface s, vec3 v, float lift) {
  vec3 from = s.position + s.face * lift;
  vec3 light = vec3(0.0);
  float chance;
  vec3 back = reflectance(s, v, uEnvDirection, chance);
  if (chance > 0.0 && !blocked(from, spreadFrom(uEnvDirection))) {
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
uniform float uGroundRoughness;
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
  float close = 1.0 - smoothstep(uFade * 0.25, uFade * 0.7, distance);
  vec3 from = at + vec3(0.0, lift, 0.0);
  float shadow = 0.0;
  if (uSunGround > 0.0 && blocked(from, uSunDirection)) {
    shadow = uSunGround * (1.0 - smoothstep(uFade * 0.6, uFade, distance));
  }
  if (uEnvGround > 0.0 && close * inside > 0.0 && blocked(from, spreadFrom(uEnvDirection))) {
    shadow = 1.0 - (1.0 - shadow) * (1.0 - uEnvGround * 0.92 * close * inside);
  }
  return shadow;
}`;

export const TRACE_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
in vec2 vUv;
uniform mat4 uInverse;
// From the world to the picture, for the depth of what the eye sees first: what is drawn over the frame afterwards, as the
// drawing of a Canvas is, lies behind or in front of it by that.
uniform mat4 uViewProjection;
uniform vec3 uEye;
uniform float uSeed;
uniform float uExposure;
// A small step off a surface, so a ray that starts on it does not meet it again.
uniform float uLift;
layout(location = 0) out vec4 fragment;
// What the eye sees first at this pixel, for telling the grain of the picture from what it shows: the way the surface faces with
// its distance, and its color with how rough it is. Nothing where it sees no surface, or one in the ground.
layout(location = 1) out vec4 guide;
layout(location = 2) out vec4 look;
${TONE_CURVE}
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
  guide = vec4(0.0);
  look = vec4(0.0);
  gl_FragDepth = 1.0;
  // A Canvas that the eye sees directly is left out here and drawn over the frame, as sharp as the screen. This is where it was.
  vec4 canvas = vec4(0.0);
  // A path turns at most eight times, which glass needs: in, out, and what it mirrors inside. Passing through what is see-through is no turn, but it ends somewhere too.
  int bounce = 0;
  bool mirrored = false;
  for (int visit = 0; visit < 24 && bounce < 8; visit++) {
    Hit hit;
    bool found = trace(origin, direction, 1e30, false, hit);
    float toGround = direction.y < 0.0 && origin.y > uFloor ? (uFloor - origin.y) / direction.y : -1.0;
    Surface s;
    if (toGround > 0.0 && (!found || toGround < hit.distance)) {
      vec3 at = origin + direction * toGround;
      if (seeing) {
        // The ground as the eye sees it: the page with its shadows, and what the ground reflects.
        if (!mirrored) {
          shadow = groundShadow(at, uLift);
        }
        if (uReflection <= 0.0 || mirrored) {
          break;
        }
        mirrored = true;
        reflected = uReflection;
        origin = at + vec3(0.0, uLift, 0.0);
        direction = reflect(direction, leaning(vec3(0.0, 1.0, 0.0), uGroundRoughness));
        if (direction.y <= 0.0) {
          break;
        }
        continue;
      }
      // The ground as light finds it on its way: a matte surface that throws light back.
      s.position = at;
      s.face = vec3(0.0, 1.0, 0.0);
      s.normal = s.face;
      s.color = uGroundColor;
      s.opacity = 1.0;
      s.metallic = 0.0;
      s.roughness = 1.0;
      s.emissive = vec3(0.0);
      s.transmission = 0.0;
      s.unlit = false;
    } else if (!found) {
      if (!seeing) {
        // After a turn in glass there was no other way to find this light, so it counts in full.
        float sky = skyChance(direction);
        float weight = chance < 0.0 ? 1.0 : chance * chance / (chance * chance + sky * sky);
        light += through * environment(direction) * weight;
      }
      break;
    } else {
      s = surfaceOf(hit, origin, direction);
      if (s.unlit && seeing && !mirrored) {
        if (canvas.a == 0.0) {
          canvas = vec4(s.face, distance(s.position, uEye));
        }
        origin = s.position + direction * uLift;
        continue;
      }
      if (s.opacity < 1.0 && random() > s.opacity) {
        origin = s.position + direction * uLift;
        continue;
      }
    }
    if (seeing) {
      cover = reflected;
      seeing = false;
      if (!mirrored) {
        // What glows keeps its own pattern, so it counts as glossy and is not smoothed.
        bool glows = s.emissive.r + s.emissive.g + s.emissive.b > 0.05;
        guide = vec4(s.normal, distance(s.position, uEye));
        look = vec4(s.color, glows || s.unlit || s.transmission > 0.0 ? 0.0 : s.roughness);
        vec4 placed = uViewProjection * vec4(s.position, 1.0);
        gl_FragDepth = clamp(placed.z / placed.w * 0.5 + 0.5, 0.0, 1.0);
      }
    }
    light += through * s.emissive;
    if (s.unlit) {
      break;
    }
    if (random() < s.transmission) {
      // Glass: a part of the light is mirrored, more the flatter it comes, and the rest goes through and bends.
      vec3 facet = leaning(s.normal, s.roughness);
      float cosine = min(dot(-direction, facet), 1.0);
      float plain = pow((s.ior - 1.0) / (s.ior + 1.0), 2.0);
      float share = plain + (1.0 - plain) * pow(1.0 - max(cosine, 0.0), 5.0);
      vec3 bent = refract(direction, facet, s.entering ? 1.0 / s.ior : s.ior);
      if (dot(bent, bent) == 0.0 || random() < share) {
        direction = reflect(direction, facet);
        origin = s.position + s.face * uLift;
      } else {
        direction = bent;
        origin = s.position - s.face * uLift;
        through *= s.color;
      }
      chance = -1.0;
      bounce++;
      continue;
    }
    vec3 v = -direction;
    light += through * direct(s, v, uLift);
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
    bounce++;
  }
  // One bright path would stay as a speck for a long time, so no path counts for more than this.
  light = min(light, vec3(24.0)) * uExposure;
  if (canvas.a > 0.0) {
    // Where a Canvas will be drawn, nothing is smoothed, so its drawing stays as it is.
    guide = canvas;
    look = vec4(1.0, 1.0, 1.0, 0.0);
  }
  fragment = vec4(light * cover * (1.0 - shadow), shadow + cover * (1.0 - shadow));
}`;
