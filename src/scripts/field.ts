/* ─────────────────────────────────────────────────────────
 * THE FIELD
 *
 * The "A" as a halftone print, drawn by one fragment shader.
 * Every pixel is either ink or paper; tone is made by dot size.
 *
 * What moves:
 *   always     a slow current drifts through the tone (TONE.drift)
 *   on load    dots grow from nothing to their size  (REVEAL)
 *   on scroll  the clouds of tone around the A spread  (TONE.scroll)
 *   pointer    a soft lens swaps ink and paper under the cursor
 *   press      a ring runs out from the point, swapping ink and paper (RIPPLE)
 *
 * With reduced motion it is drawn once, still, at full size.
 * ───────────────────────────────────────────────────────── */

const SCREEN = {
  cell: 5.5, // CSS px between dot centres
  angle: 15, // degrees; the classic angle for a single-colour screen
  maxDpr: 2, // cap, so 3x phones do not shade nine times the pixels
  fps: 30, // a print does not need 60
};

const GLYPH = {
  height: 0.78, // share of the field's height the A may take
  width: 0.86, // and of its width, whichever binds first
  widthStacked: 0.78, // on narrow screens, where the field sits above the text
  x: 0.56, // centre, as a share of the field (right of middle: the text sits left)
  y: 0.5,
  texture: 512, // px, the A is rasterised once into a mask this size
  blur: 7, // px of softness on the mask edge, so dots taper at the outline
};

const TONE = {
  drift: 1, // speed multiplier of the current
  scroll: 0.3, // how far the clouds of tone spread from top to bottom of the page
  ease: 0.08, // per-frame easing of scroll and pointer (0..1)
  lens: 0.16, // pointer lens radius, as a share of the field's height
};

const RIPPLE = {
  speed: 0.9, // field heights per second the ring travels
  band: 0.07, // ring thickness, as a share of the field's height
  life: 2.2, // seconds until it is gone
};

const REVEAL = {
  delay: 250, // ms before the dots start to grow
  duration: 1600, // ms to full size
};

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2 uRes;          // canvas size, device px
uniform float uTime;        // seconds
uniform float uScroll;      // 0 at the top of the page, 1 at the end
uniform float uReveal;      // 0..1, dots growing in
uniform float uCell;        // dot pitch, device px
uniform float uAngle;       // screen angle, radians
uniform float uStacked;     // 0: beside the text, fade left. 1: above it, fade down
uniform vec2 uPointer;      // device px, origin top left
uniform float uPointerOn;   // 0..1
uniform float uLens;        // lens radius, device px
uniform vec3 uRipple;       // press point (device px) and its age in seconds; age < 0 is none
uniform vec2 uRippleShape;  // ring speed and thickness, device px
uniform float uScrollTone;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform sampler2D uMask;    // the A, alpha only, soft-edged
uniform vec4 uGlyph;        // where the mask sits: x, y, w, h in device px

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum;
}

// How much ink the print wants at a point (0 paper, 1 solid).
float tone(vec2 c) {
  vec2 uv = c / uRes;
  vec2 q = vec2(uv.x * uRes.x / uRes.y, uv.y);

  float current = fbm(q * 1.6 + vec2(uTime * 0.020, -uTime * 0.012));
  float veins = fbm(q * 3.0 - vec2(uTime * 0.016, uTime * 0.010) + 4.7);

  // Clouds of tone with bare paper between them, a little heavier towards the foot.
  // Reading down the page lets the clouds spread, rather than greying everything evenly.
  float spread = uScrollTone * uScroll;
  float cloud = smoothstep(0.38 - spread, 0.82 - spread * 0.6, current);
  float paper = (0.32 + 0.5 * spread) * cloud + 0.04 * uv.y * uv.y;
  float glyph = 0.97 - 0.36 * veins;

  vec2 g = (c - uGlyph.xy) / uGlyph.zw;
  float inside = 0.0;
  if (g.x > 0.0 && g.x < 1.0 && g.y > 0.0 && g.y < 1.0) {
    inside = smoothstep(0.2, 0.8, texture2D(uMask, g).a);
  }
  // The surrounding tone thins out towards the text (or, stacked, towards the
  // letter below), so the print has no edge. The A itself is never faded.
  float edge = mix(smoothstep(0.04, 0.46, uv.x), 1.0 - smoothstep(0.6, 1.0, uv.y), uStacked);
  float v = mix(paper * edge, glyph, inside);

  // The lens: under the pointer, ink and paper trade places.
  float d = distance(c, uPointer) / uLens;
  float swap = (1.0 - 2.0 * inside) * mix(edge, 1.0, inside);
  v += uPointerOn * 0.34 * exp(-d * d) * swap;

  // A press sends one ring outwards that does the same, fading as it goes.
  if (uRipple.z >= 0.0) {
    float off = (distance(c, uRipple.xy) - uRipple.z * uRippleShape.x) / uRippleShape.y;
    v += 0.55 * exp(-off * off) * exp(-uRipple.z * 2.0) * swap;
  }

  return clamp(v, 0.0, 1.0);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float s = sin(uAngle), c = cos(uAngle);
  mat2 turn = mat2(c, -s, s, c);

  // Find this pixel's dot on the rotated screen, then ask for the tone at its centre.
  vec2 r = turn * p / uCell;
  vec2 cell = floor(r) + 0.5;
  vec2 centre = (cell * uCell) * turn;

  float v = tone(centre);
  float radius = sqrt(v) * 0.74 * uReveal;   // dot area follows tone; 0.707 closes the cell
  float aa = 1.1 / uCell;
  float ink = 1.0 - smoothstep(radius - aa, radius + aa, length(r - cell));
  ink *= smoothstep(0.0, 0.05, v);           // the faintest tone thins out, it does not stop at a line

  gl_FragColor = vec4(mix(uPaper, uInk, ink), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** The A, rasterised once as a soft alpha mask the shader can sample. */
function drawMask(path: string) {
  const size = GLYPH.texture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // The mark is drawn on a 512 canvas; its ink sits in roughly x 94..420, y 52..425.
  const box = { x: 94, y: 52, w: 326, h: 373 };
  const pad = GLYPH.blur * 2.5;
  const scale = Math.min((size - pad * 2) / box.w, (size - pad * 2) / box.h);
  const w = box.w * scale;
  const h = box.h * scale;

  // Only the shadow is kept: the shape itself is drawn far off canvas. That gives a
  // blurred edge in every browser, without relying on canvas filters.
  const away = size * 2;
  ctx.shadowColor = "#000";
  ctx.shadowBlur = GLYPH.blur;
  ctx.shadowOffsetX = away;
  ctx.translate((size - w) / 2 - box.x * scale - away, (size - h) / 2 - box.y * scale);
  ctx.scale(scale, scale);
  ctx.fill(new Path2D(path));

  // Share of the texture the glyph's own box covers, for placing it in the field.
  return { canvas, glyphW: w / size, glyphH: h / size, aspect: box.w / box.h };
}

function cssColour(name: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return name === "--ink" ? [0.08, 0.08, 0.07] : [0.96, 0.96, 0.94];
  const n = Number.parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function startField() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-field]");
  const path = canvas?.dataset.mark;
  if (!canvas || !path) return;

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  const mask = drawMask(path);
  if (!gl || !mask) return;

  const vert = compile(gl, gl.VERTEX_SHADER, VERT);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vert || !frag || !program) return;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask.canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniform = {
    res: u("uRes"),
    time: u("uTime"),
    scroll: u("uScroll"),
    reveal: u("uReveal"),
    cell: u("uCell"),
    angle: u("uAngle"),
    stacked: u("uStacked"),
    pointer: u("uPointer"),
    pointerOn: u("uPointerOn"),
    lens: u("uLens"),
    ripple: u("uRipple"),
    rippleShape: u("uRippleShape"),
    scrollTone: u("uScrollTone"),
    ink: u("uInk"),
    paper: u("uPaper"),
    glyph: u("uGlyph"),
  };
  gl.uniform1f(uniform.angle, (SCREEN.angle * Math.PI) / 180);
  gl.uniform1f(uniform.scrollTone, TONE.scroll);

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const stacked = matchMedia("(max-width: 960px)");
  const scheme = matchMedia("(prefers-color-scheme: dark)");

  let dpr = 1;
  const state = { scroll: 0, pointerX: -9999, pointerY: -9999, pointerOn: 0 };
  const target = { scroll: 0, pointerX: -9999, pointerY: -9999, pointerOn: 0 };
  const ripple = { x: 0, y: 0, at: -1 }; // at: when it was pressed (ms), -1 for none

  function colours() {
    gl?.uniform3fv(uniform.ink, cssColour("--ink"));
    gl?.uniform3fv(uniform.paper, cssColour("--bg"));
  }

  function resize() {
    if (!canvas || !gl || !mask) return;
    dpr = Math.min(window.devicePixelRatio || 1, SCREEN.maxDpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uniform.res, w, h);
    gl.uniform1f(uniform.cell, SCREEN.cell * dpr);
    gl.uniform1f(uniform.lens, TONE.lens * h);
    gl.uniform2f(uniform.rippleShape, RIPPLE.speed * h, RIPPLE.band * h);
    gl.uniform1f(uniform.stacked, stacked.matches ? 1 : 0);

    // Fit the glyph's box, then grow the rect to the whole (padded) texture.
    const fit = stacked.matches ? GLYPH.widthStacked : GLYPH.width;
    const gh = Math.min(h * GLYPH.height, (w * fit) / mask.aspect);
    const gw = gh * mask.aspect;
    const tw = gw / mask.glyphW;
    const th = gh / mask.glyphH;
    const cx = w * (stacked.matches ? 0.5 : GLYPH.x);
    const cy = h * (stacked.matches ? 0.46 : GLYPH.y);
    gl.uniform4f(uniform.glyph, cx - tw / 2, cy - th / 2, tw, th);
  }

  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  const started = performance.now();
  let last = 0;
  let raf = 0;
  let onScreen = true;

  function draw(now: number) {
    if (!gl) return;
    const still = reduceMotion.matches;
    const k = still ? 1 : TONE.ease;
    state.scroll += (target.scroll - state.scroll) * k;
    state.pointerX += (target.pointerX - state.pointerX) * (still ? 1 : 0.14);
    state.pointerY += (target.pointerY - state.pointerY) * (still ? 1 : 0.14);
    state.pointerOn += (target.pointerOn - state.pointerOn) * k;

    const elapsed = now - started;
    const t = Math.min(1, Math.max(0, (elapsed - REVEAL.delay) / REVEAL.duration));
    const reveal = still ? 1 : 1 - (1 - t) ** 3; // ease-out cubic

    gl.uniform1f(uniform.time, still ? 0 : (elapsed / 1000) * TONE.drift);
    gl.uniform1f(uniform.scroll, state.scroll);
    gl.uniform1f(uniform.reveal, reveal);
    gl.uniform2f(uniform.pointer, state.pointerX * dpr, state.pointerY * dpr);
    gl.uniform1f(uniform.pointerOn, state.pointerOn);

    let age = ripple.at < 0 ? -1 : (now - ripple.at) / 1000;
    if (age > RIPPLE.life) age = ripple.at = -1;
    gl.uniform3f(uniform.ripple, ripple.x * dpr, ripple.y * dpr, age);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (now - last < 1000 / SCREEN.fps) return;
    last = now;
    draw(now);
  }

  function play() {
    cancelAnimationFrame(raf);
    if (reduceMotion.matches) {
      draw(performance.now());
      return;
    }
    if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", readScroll, { passive: true });
  new ResizeObserver(() => {
    resize();
    readScroll();
    draw(performance.now()); // resizing clears a canvas: repaint at once, never show it empty
  }).observe(canvas);

  // The lens only follows a real pointer; touch scrolling should not smear it around.
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (event) => {
        const rect = canvas.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        target.pointerOn = inside ? 1 : 0;
        if (!inside) return;
        if (state.pointerOn < 0.01) {
          // Arriving: start the lens where the pointer is, do not fly it in from afar.
          state.pointerX = event.clientX - rect.left;
          state.pointerY = event.clientY - rect.top;
        }
        target.pointerX = event.clientX - rect.left;
        target.pointerY = event.clientY - rect.top;
      },
      { passive: true }
    );
    document.documentElement.addEventListener("pointerleave", () => (target.pointerOn = 0));
  }

  // A press anywhere on the field, mouse or finger, starts a ring there.
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (reduceMotion.matches) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      ripple.x = x;
      ripple.y = y;
      ripple.at = performance.now();
    },
    { passive: true }
  );

  // Rest when nobody can see it.
  new IntersectionObserver(([entry]) => {
    onScreen = Boolean(entry?.isIntersecting);
    play();
  }).observe(canvas);
  document.addEventListener("visibilitychange", play);
  reduceMotion.addEventListener("change", play);
  stacked.addEventListener("change", resize);
  scheme.addEventListener("change", () => {
    colours();
    if (reduceMotion.matches) draw(performance.now());
  });

  colours();
  resize();
  readScroll();
  state.scroll = target.scroll;
  draw(performance.now()); // paint paper before the canvas is shown, so it never flashes dark
  canvas.classList.add("is-live"); // shows the canvas and hides the SVG fallback
  play();
}
