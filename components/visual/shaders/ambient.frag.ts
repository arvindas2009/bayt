/**
 * The app's ambient background: slow aurora ribbons in the accent colours behind every dashboard
 * page. Purely decorative and deliberately faint, so cards and text stay the focus.
 *
 * Written as premultiplied emission on a transparent canvas over --bg. On the light theme
 * (u_light = 1) the ribbons become darker pigment at a lower alpha, the same trick as LoadField.
 *   u_pointer = (x, y) in 0..1 from the top-left, eased; the ribbons lean gently towards it.
 */
export const AMBIENT_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;
uniform float u_light;

const vec3 LIME   = vec3(0.776, 0.957, 0.196);
const vec3 VIOLET = vec3(0.655, 0.482, 1.000);
const vec3 PINK   = vec3(1.000, 0.310, 0.482);
const vec3 CYAN   = vec3(0.239, 0.863, 0.784);

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
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = p * 2.02 + vec2(5.3, 1.7);
    a *= 0.5;
  }
  return s;
}

// One ribbon: a soft band around a noisy curve y = base + wave(x).
float ribbon(vec2 p, float base, float speed, float seed, float t) {
  float wave = (fbm(vec2(p.x * 0.9 + t * speed, seed)) - 0.5) * 1.1;
  float d = abs(p.y - base - wave);
  float core = exp(-d * d * 60.0);
  float halo = exp(-d * d * 7.0) * 0.35;
  // Vertical shimmer, like curtains of light.
  float streak = 0.6 + 0.4 * fbm(vec2(p.x * 7.0 + seed, p.y * 1.5 - t * 0.2));
  return (core + halo) * streak;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.06;

  // Lean towards the pointer, gently.
  vec2 ptr = (vec2(u_pointer.x, 1.0 - u_pointer.y) - 0.5) * vec2(aspect, 1.0);
  p += (ptr - p) * 0.05 * exp(-length(ptr - p) * 1.2);

  // Domain warp so the bands fold instead of sliding.
  vec2 q = vec2(fbm(p * 0.8 + t), fbm(p * 0.8 - t + 3.1));
  vec2 w = p + (q - 0.5) * 0.45;

  float r1 = ribbon(w, 0.26, 0.9, 1.3, t);
  float r2 = ribbon(w + vec2(0.4, 0.0), -0.02, -0.7, 4.1, t);
  float r3 = ribbon(w - vec2(0.3, 0.0), -0.30, 0.55, 7.7, t);

  float hue = fbm(w * 0.7 + vec2(t * 0.5, 0.0));
  vec3 c1 = mix(LIME, CYAN, smoothstep(0.35, 0.7, hue));
  vec3 c2 = mix(VIOLET, PINK, smoothstep(0.4, 0.75, hue));
  vec3 c3 = mix(PINK, VIOLET, smoothstep(0.3, 0.6, hue));

  vec3 em = c1 * r1 + c2 * r2 * 0.9 + c3 * r3 * 0.7;

  // Fade towards the edges so it never ends in a hard rectangle; brightest top-right.
  float vig = smoothstep(1.25, 0.15, length((uv - vec2(0.62, 0.62)) * vec2(1.1, 1.3)));
  em *= vig;

  float strength = max(max(em.r, em.g), em.b);
  if (u_light > 0.5) {
    vec3 c = clamp(em / max(strength, 1e-3), 0.0, 1.0);
    c = c * c * 0.75;
    float a = clamp(strength, 0.0, 1.0) * 0.13;
    outColor = vec4(c * a, a);
  } else {
    float a = clamp(strength, 0.0, 1.0) * 0.22;
    vec3 c = clamp(em / max(strength, 1e-3), 0.0, 1.0);
    outColor = vec4(c * a, a);
  }
}
`
