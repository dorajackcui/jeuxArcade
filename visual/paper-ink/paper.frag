#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uGrain;
uniform vec2 uViewportPx;
uniform float uPixelRatio;
uniform float uPeriod;
uniform float uStrength;
out vec4 outColor;

vec3 softLight(vec3 base, float grain) {
  vec3 lift = mix(((16.0 * base - 12.0) * base + 4.0) * base,
                  sqrt(base), step(vec3(0.25), base));
  return grain <= 0.5
    ? base - (1.0 - 2.0 * grain) * base * (1.0 - base)
    : base + (2.0 * grain - 1.0) * (lift - base);
}

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec3 base = texture(uScene, pixel / uViewportPx).rgb;
  vec2 paperPx = vec2(pixel.x, uViewportPx.y - pixel.y) / uPixelRatio;
  float grain = texture(uGrain, paperPx / uPeriod).r;
  outColor = vec4(mix(base, softLight(base, grain), clamp(uStrength, 0.0, 1.0)), 1.0);
}
