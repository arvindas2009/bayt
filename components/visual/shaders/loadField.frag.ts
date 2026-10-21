/**
 * The "load field": every family member is a soft glowing body whose size and heat follow their
 * computed load score. Bodies merge through a metaball field, a slow domain-warped silk surface
 * moves underneath, and accepted handoffs travel between bodies as luminous streams.
 *
 * Everything is emission on a transparent canvas (premultiplied alpha), so it sits on any dark
 * surface and fades out at the edges instead of ending in a hard rectangle. On the light theme
 * (u_light = 1) the same field is written out as darker, saturated pigment, because light added
 * to a near-white page would vanish.
 *
 * Inputs are plain uniforms, no textures:
 *   u_bodies[i] = (x, y, radius, heat)   x,y in 0..1 from the top-left, radius in canvas heights
 *   u_state[i]  = (cool, highlight, spark, unused)
 *   u_flows[j]  = (fromIndex, toIndex, t 0..1.35, strength)
 */
export const MAX_BODIES = 8
export const MAX_FLOWS = 4

export const LOAD_FIELD_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

#define MAX_BODIES ${MAX_BODIES}
#define MAX_FLOWS ${MAX_FLOWS}

uniform vec2  u_res;
uniform float u_time;
uniform int   u_count;
uniform vec4  u_bodies[MAX_BODIES];
uniform vec3  u_colors[MAX_BODIES];
uniform vec4  u_state[MAX_BODIES];
uniform int   u_flowCount;
uniform vec4  u_flows[MAX_FLOWS];
uniform vec3  u_pointer;
uniform float u_light;

// Accent lime, load pink, secondary violet (the dark-theme --sand, --ember, --dusk).
const vec3 SAND  = vec3(0.776, 0.957, 0.196);
const vec3 EMBER = vec3(1.000, 0.310, 0.482);
const vec3 DUSK  = vec3(0.655, 0.482, 1.000);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec2(7.1, 3.7);
    a *= 0.5;
  }
  return s;
}

vec2 toSpace(vec2 xy) {
  float aspect = u_res.x / u_res.y;
  return (vec2(xy.x, 1.0 - xy.y) - 0.5) * vec2(aspect, 1.0);
}

vec2 bodyCenter(int i, float t) {
  vec2 c = toSpace(u_bodies[i].xy);
  // The bodies breathe around their anchors; a cooled body stops drifting.
  float live = 1.0 - u_state[i].x;
  c += live * 0.012 * vec2(sin(t * 0.4 + float(i) * 1.7), cos(t * 0.33 + float(i) * 2.3));
  return c;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time;

  // Silk: a slow, domain-warped surface under everything.
  vec2 q = p * 1.6;
  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.03)), fbm(q + vec2(5.2, 1.3) - vec2(t * 0.025, 0.0)));
  float silk = fbm(q * 1.2 + 2.2 * w);
  float bands = 0.5 + 0.5 * sin((silk * 9.0 + p.x * 1.5) * 3.14159);

  // Metaball field. Each body adds r^2 / d^2, so neighbours merge smoothly.
  float F = 0.0;
  vec3 colAcc = vec3(0.0);
  float wAcc = 0.0;
  float heatAcc = 0.0;
  float coolAcc = 0.0;
  float hiAcc = 0.0;
  float sparks = 0.0;

  for (int i = 0; i < MAX_BODIES; i++) {
    if (i >= u_count) break;
    vec2 c = bodyCenter(i, t);
    float r = u_bodies[i].z * (1.0 + 0.03 * sin(t * 0.9 + float(i)));
    vec2 d = p - c + (w - 0.5) * r * 0.45;
    float dist2 = dot(d, d);
    float infl = (r * r) / (dist2 + 0.0025);
    F += infl;
    float wt = pow(infl, 1.5);
    colAcc += u_colors[i] * wt;
    wAcc += wt;
    heatAcc += u_bodies[i].w * wt;
    coolAcc += u_state[i].x * wt;
    hiAcc += u_state[i].y * wt;

    // Failure sparks: rings that pulse outward from bodies that inherit or drop tasks.
    float s = u_state[i].z;
    if (s > 0.0) {
      float ph = fract(t * 0.7 + float(i) * 0.31);
      float ring = exp(-pow((length(p - c) - r * (1.1 + ph * 1.3)) / 0.012, 2.0)) * (1.0 - ph);
      sparks += ring * s;
    }
  }

  vec3 body = colAcc / max(wAcc, 1e-4);
  float heat = heatAcc / max(wAcc, 1e-4);
  float cool = coolAcc / max(wAcc, 1e-4);
  float hi = hiAcc / max(wAcc, 1e-4);

  // Overload shifts a body toward ember; absence cools it to a dull blue-grey.
  body = mix(body, EMBER, smoothstep(0.5, 0.9, heat) * 0.85);
  float luma = dot(body, vec3(0.299, 0.587, 0.114));
  body = mix(body, vec3(luma) * vec3(0.72, 0.80, 0.95) * 0.7, cool);

  float core = smoothstep(0.9, 3.2, F);
  float halo = smoothstep(0.10, 1.0, F);

  // Iso-contours radiating from the bodies: the "field lines".
  float lines = 0.5 + 0.5 * cos(F * 14.0 - t * 0.6 * (1.0 - cool));
  lines = pow(lines, 6.0) * halo * (1.0 - core) * 0.55;

  vec3 em = body * (0.26 * halo + 0.8 * core * (0.7 + 0.5 * silk));
  em += body * lines;
  em += body * hi * 0.35 * halo;

  // Cooled bodies fracture: thin dark seams across the core.
  float crack = smoothstep(0.03, 0.0, abs(fbm(p * 6.5 + 3.0) - 0.5));
  em *= 1.0 - cool * crack * smoothstep(0.4, 1.0, F) * 0.9;

  // Faint silk everywhere else, tinted dusk with a thread of sand.
  float ambient = smoothstep(0.30, 0.80, silk);
  em += DUSK * 0.07 * ambient + SAND * 0.025 * bands * ambient;

  // Flows: curved streams that carry a handoff from one body to another.
  for (int j = 0; j < MAX_FLOWS; j++) {
    if (j >= u_flowCount) break;
    float ft = u_flows[j].z;
    if (ft <= 0.0 || ft >= 1.35) continue;
    int a = int(u_flows[j].x + 0.5);
    int b = int(u_flows[j].y + 0.5);
    vec2 A = bodyCenter(a, t);
    vec2 B = bodyCenter(b, t);
    vec2 dir = B - A;
    float len = max(length(dir), 1e-4);
    vec2 ctrl = (A + B) * 0.5 + vec2(-dir.y, dir.x) / len * len * 0.28;

    float best = 1e3;
    float bestS = 0.0;
    vec2 prev = A;
    for (int k = 1; k <= 14; k++) {
      float s = float(k) / 14.0;
      vec2 pt = (1.0 - s) * (1.0 - s) * A + 2.0 * (1.0 - s) * s * ctrl + s * s * B;
      vec2 e = pt - prev;
      vec2 pa = p - prev;
      float h = clamp(dot(pa, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
      float dd = length(pa - e * h);
      if (dd < best) {
        best = dd;
        bestS = (float(k - 1) + h) / 14.0;
      }
      prev = pt;
    }

    float behind = ft - bestS;
    float trail = behind >= 0.0 ? exp(-behind * 5.0) : 0.0;
    float packet = exp(-pow(behind / 0.05, 2.0));
    float width = 0.006 + 0.012 * packet;
    float line = exp(-pow(best / width, 2.0));
    float fade = smoothstep(0.0, 0.08, ft) * (1.0 - smoothstep(1.0, 1.35, ft));
    vec3 fc = mix(u_colors[a], u_colors[b], bestS);
    em += (fc * 0.9 + SAND * 0.6) * line * (trail * 0.7 + packet) * fade * u_flows[j].w;
  }

  em += EMBER * sparks * 0.8;

  // The pointer carries a small light so the field feels responsive.
  float pd = length(p - toSpace(u_pointer.xy));
  em += SAND * 0.06 * exp(-pd * pd * 40.0) * u_pointer.z;

  // Fade to nothing at the canvas edges so there is no visible rectangle.
  float edge = smoothstep(0.0, 0.12, uv.x) * smoothstep(0.0, 0.12, 1.0 - uv.x)
             * smoothstep(0.0, 0.15, uv.y) * smoothstep(0.0, 0.15, 1.0 - uv.y);
  em *= edge;

  // Dither against banding in the dark gradients.
  em += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0 * edge;

  em = 1.0 - exp(-em * 1.5); // soft tone-map: bright cores roll off instead of clipping to white
  float alpha = clamp(max(em.r, max(em.g, em.b)) * 1.05, 0.0, 1.0);
  if (u_light > 0.5) {
    // Paper theme: un-premultiply, darken and saturate into ink, then premultiply again.
    vec3 c = clamp(em / max(alpha, 1e-3), 0.0, 1.0);
    c = mix(c, c * c, 0.6) * 0.88;
    float a = alpha * 0.92;
    outColor = vec4(c * a, a);
  } else {
    outColor = vec4(min(em, vec3(alpha)), alpha);
  }
}
`
