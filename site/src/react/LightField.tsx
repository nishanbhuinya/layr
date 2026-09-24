/**
 * The light behind the hero: four soft sources (ember, gold, teal, violet) drifting slowly in a
 * WebGL fragment shader. Static gradients when WebGL, motion or visibility say no.
 */
import { useEffect, useRef } from "react";

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_dark;
vec3 src(vec2 uv, vec2 p, vec3 c, float r) {
  float d = length((uv - p) * vec2(u_res.x / u_res.y, 1.0));
  return c * exp(-d * d / r);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_t * 0.05;
  vec3 ember = vec3(1.0, 0.42, 0.24);
  vec3 gold = vec3(1.0, 0.77, 0.42);
  vec3 teal = vec3(0.18, 0.83, 0.77);
  vec3 violet = vec3(0.61, 0.55, 1.0);
  vec3 col = vec3(0.0);
  // The light gathers behind the work (right and top), leaving the text column calm.
  col += src(uv, vec2(0.58 + 0.08 * sin(t * 1.3), 1.02 + 0.04 * cos(t)), ember, 0.12);
  col += src(uv, vec2(0.84 + 0.06 * cos(t * 0.8), 0.96 + 0.03 * sin(t * 1.7)), gold, 0.05);
  col += src(uv, vec2(1.02 + 0.04 * sin(t * 0.9), 0.36 + 0.08 * cos(t * 1.1)), teal, 0.09);
  col += src(uv, vec2(0.76 + 0.07 * cos(t * 1.2), 0.60 + 0.07 * sin(t * 0.7)), violet, 0.10);
  vec3 ground = mix(vec3(0.957, 0.937, 0.906), vec3(0.071, 0.067, 0.063), u_dark);
  float strength = mix(0.5, 0.3, u_dark);
  // Dark: the light adds to the ground. Light: it tints the paper toward each hue, never greys it.
  vec3 hue = col / max(1.0, max(col.r, max(col.g, col.b)));
  float amount = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0) * 0.42;
  vec3 lit = u_dark > 0.5 ? ground + col * strength : mix(ground, hue, amount);
  gl_FragColor = vec4(lit, 1.0);
}`;

const VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";

function isDark(): boolean {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

export function LightField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type) as WebGLShader;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram() as WebGLProgram;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uT = gl.getUniformLocation(prog, "u_t");
    const uDark = gl.getUniformLocation(prog, "u_dark");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const draw = () => {
      const dpr = Math.min(1.5, devicePixelRatio);
      const w = Math.round(canvas.clientWidth * dpr * 0.5);
      const h = Math.round(canvas.clientHeight * dpr * 0.5);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uT, still ? 12 : (performance.now() - start) / 1000);
      gl.uniform1f(uDark, isDark() ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!still && visible) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => requestAnimationFrame(draw));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    canvas.dataset.lit = "";
    draw();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="light-field" aria-hidden="true" />;
}
