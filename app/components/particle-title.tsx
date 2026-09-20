"use client";

import { useEffect, useRef } from "react";

/* ---------------------------------------------------------------------------
   ParticleTitle — the display headline assembles out of ink particles.

   Ported from the HyperFrames block `code-particle-assemble`
   (registry/blocks/code-particle-assemble): glyph pixels are rasterised once to
   an offscreen 2D canvas, sampled on a fixed grid and uploaded as a GPU point
   cloud whose particles fly in from scattered origins, decelerating and landing
   exactly on the glyphs. The block's 1920×1080 code-slab cut was re-cut for a
   page hero:

     - the raster comes from the live <h1> instead of baked Shiki tokens, so the
       headline can be written as ordinary JSX copy (italic accent included);
     - the canvas is transparent, so the paper stock (and the plate drawing
       behind it) stays visible while the ink condenses;
     - the particles hand the frame back to the real <h1> instead of standing in
       for it — the copy is selectable, crawlable and readable by assistive tech
       at all times, and the crossfade at the end snaps to crisp type;
     - no GSAP, no three.js: ~200 lines and a seeded PRNG.

   Two details that matter:
     - `html.pt-anim` is added by a tiny script in the page *before first paint*
       and holds the headline at opacity 0, which is what stops the static title
       from flashing before the animation starts. It is released (with a 6s
       safety valve) the moment the particles land.
     - Text geometry is measured from the DOM: one Range per text node for x, the
       font's ascent for the baseline (Chrome's inline text rect is the font's
       content box, i.e. ascent+descent centred in the line box), so the settled
       particles sit on the same pixels the browser would have painted.

   Degrades to plain static text on reduced motion, missing WebGL, a background
   tab, or any layout the sampler cannot map 1:1 (a wrapped text node).
   --------------------------------------------------------------------------- */

export type ParticleTitleProps = {
  /** classes for the positioned wrapper that carries the headline + the canvas */
  wrapperClassName?: string;
  /** typography classes for the headline (from the landing CSS module) */
  className?: string;
  /** classes for the block that carries the middle line */
  hangClassName?: string;
  /** classes for the particle layer (from the landing CSS module) */
  canvasClassName?: string;
  /**
   * How fast the particles fly together: 1 = the tuned default, 2 = twice as
   * quick, 0.5 = twice as slow. Clamped to 0.1–6. Appending `?pt=<n>` to the
   * URL overrides it for that page load (handy for tuning without a rebuild).
   */
  speed?: number;
  /** visual-test hook: draw the settled frame and never reveal (no animation) */
  debugSettle?: boolean;
};

const MAX_PARTICLES = 60000;
const ASSEMBLE_MS = 1500; // at speed 1
const DWELL_MS = 320; // at speed 1
const SETTLE_FADE_MS = 460;
const DENSITY = 1.15; // device px per particle before the particle budget kicks in
const MIN_SPEED = 0.1;
const MAX_SPEED = 6;

const VERT = `
attribute vec2 aTarget;
attribute vec2 aOrigin;
attribute vec3 aColor;
attribute float aDelay;
uniform float uProgress;
uniform float uSize;
uniform vec2 uRes;
varying vec3 vColor;
varying float vP;
void main() {
  float span = 0.62;
  float p = clamp((uProgress - aDelay * (1.0 - span)) / span, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  vec2 pos = mix(aOrigin, aTarget, p);
  // leftover depth: particles carry a fake z that bleeds off as they land
  float z = aDelay * 2.0 - 1.0;
  float air = 1.0 - p;
  pos += vec2(z * 34.0 * air, z * 18.0 * air);
  vec2 clip = pos / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = uSize * (0.6 + 0.4 * p) * (1.0 + 0.3 * z * air);
  vColor = aColor;
  vP = p;
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vP;
uniform vec3 uPaper;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  float a = smoothstep(0.25, 0.05, r2);
  // in flight the ink is a pale ghost of itself; landing settles it to the
  // true colour and full weight
  vec3 c = mix(vColor, uPaper, 0.55 * (1.0 - vP));
  gl_FragColor = vec4(c, a * (0.3 + 0.7 * vP));
}`;

type Segment = { text: string; x: number; baseline: number; font: string; color: string };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** any CSS colour -> [r, g, b] in 0..1 (canvas normalises hex/rgb/names for us) */
function toRgb(css: string, fallback: [number, number, number]): [number, number, number] {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const ctx = probe.getContext("2d");
  if (!ctx) return fallback;
  ctx.fillStyle = "#000";
  ctx.fillStyle = css.trim();
  const v = ctx.fillStyle;
  if (typeof v === "string" && v.startsWith("#") && v.length === 7) {
    return [
      parseInt(v.slice(1, 3), 16) / 255,
      parseInt(v.slice(3, 5), 16) / 255,
      parseInt(v.slice(5, 7), 16) / 255,
    ];
  }
  const m = typeof v === "string" ? v.match(/rgba?\(([^)]+)\)/) : null;
  if (m) {
    const p = m[1].split(",").map((n) => parseFloat(n));
    return [p[0] / 255, p[1] / 255, p[2] / 255];
  }
  return fallback;
}

/**
 * Read the headline back out of the DOM: every text node becomes one drawable
 * segment with an exact x, a baseline and the font colour it is painted in.
 * Returns null when a node wraps over more than one line — the sampler cannot
 * map that 1:1, so the caller falls back to static text.
 */
function collectSegments(
  h1: HTMLElement,
  rect: DOMRect,
  padX: number,
  padY: number,
  dpr: number,
): Segment[] | null {
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return null;
  const ascents = new Map<string, number>();
  const range = document.createRange();
  const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  const out: Segment[] = [];
  let node = walker.nextNode();

  while (node) {
    const text = node.nodeValue ?? "";
    if (text.trim().length) {
      const el = node.parentElement;
      if (!el) return null;
      range.selectNodeContents(node);
      const rects = range.getClientRects();
      if (rects.length !== 1) return null;
      const r = rects[0];
      const pcs = getComputedStyle(el);
      const px = parseFloat(pcs.fontSize) || 16;
      const font = `${pcs.fontStyle} ${pcs.fontWeight} ${(px * dpr).toFixed(2)}px ${pcs.fontFamily}`;
      let ascent = ascents.get(font);
      if (ascent === undefined) {
        measure.font = font;
        const m = measure.measureText("H");
        ascent = m.fontBoundingBoxAscent ?? px * dpr * 0.8;
        ascents.set(font, ascent);
      }
      out.push({
        text,
        x: (r.left - rect.left + padX) * dpr,
        baseline: (r.top - rect.top + padY) * dpr + ascent,
        font,
        color: pcs.color,
      });
    }
    node = walker.nextNode();
  }
  return out.length ? out : null;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function buildProgram(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function ParticleTitle({
  wrapperClassName,
  className,
  hangClassName,
  canvasClassName,
  speed = 1,
  debugSettle = false,
}: ParticleTitleProps) {
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const h1 = h1Ref.current;
    const canvas = canvasRef.current;
    if (!h1 || !canvas) return;

    // manual tuning: `?pt=2` in the URL beats the prop, for this load only
    const asked = Number(new URLSearchParams(window.location.search).get("pt"));
    const rate = Math.min(
      MAX_SPEED,
      Math.max(MIN_SPEED, Number.isFinite(asked) && asked > 0 ? asked : Number(speed) || 1),
    );
    const assembleMs = ASSEMBLE_MS / rate;
    const dwellMs = DWELL_MS / rate;

    const docEl = document.documentElement;
    const bootTimer = (window as Window & { __ptBoot?: number }).__ptBoot;
    if (bootTimer) window.clearTimeout(bootTimer);
    const releaseText = () => docEl.classList.remove("pt-anim");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = reduced
      ? null
      : (canvas.getContext("webgl", {
          alpha: true,
          premultipliedAlpha: false,
          antialias: false,
          depth: false,
          stencil: false,
        }) as WebGLRenderingContext | null);

    if (!gl) {
      canvas.style.display = "none";
      releaseText();
      return;
    }

    let raf = 0;
    let cancelled = false;
    let revealed = false;
    let program: WebGLProgram | null = null;
    let buffers: WebGLBuffer[] = [];
    let startWidth = 0;
    let landedAt = 0;

    const dropGl = () => {
      buffers.forEach((b) => gl.deleteBuffer(b));
      buffers = [];
      if (program) gl.deleteProgram(program);
      program = null;
    };

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      h1.style.transition = `opacity ${SETTLE_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`;
      canvas.style.transition = `opacity ${SETTLE_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`;
      void h1.offsetWidth; // commit the transition before flipping opacity
      h1.style.opacity = "1";
      canvas.style.opacity = "0";
      releaseText();
      window.setTimeout(() => {
        canvas.style.display = "none";
      }, SETTLE_FADE_MS + 90);
    };

    const onResize = () => {
      // a reflow while we own the frame would leave the raster stale; a width
      // change means a real relayout (mobile URL-bar resizes are height-only)
      if (!revealed && Math.abs(window.innerWidth - startWidth) > 4) reveal();
    };
    const onVisibility = () => {
      if (document.hidden && !revealed) reveal();
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
      reveal();
    };

    const start = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* no font loading API — carry on with whatever is installed */
      }
      if (cancelled) return;

      const cs = getComputedStyle(h1);
      const fontSize = parseFloat(cs.fontSize) || 48;
      const fontFamily = cs.fontFamily;
      const fontWeight = cs.fontWeight || "500";
      const letterSpacing = cs.letterSpacing.endsWith("px") ? parseFloat(cs.letterSpacing) : 0;

      // next/font swaps the webfaces in; rasterise only once they are the ones
      // the browser is actually painting with
      try {
        await Promise.all([
          document.fonts.load(`${fontWeight} ${fontSize}px ${fontFamily}`),
          document.fonts.load(`italic ${fontWeight} ${fontSize}px ${fontFamily}`),
        ]);
      } catch {
        /* fall through */
      }
      if (cancelled) return;

      const rect = h1.getBoundingClientRect();
      if (rect.width < 60 || rect.height < 20) {
        releaseText();
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const padX = Math.min(Math.max(rect.width * 0.34, 56), 340);
      const padY = Math.min(Math.max(rect.height * 0.5, 52), 240);
      const W = Math.round((rect.width + padX * 2) * dpr);
      const H = Math.round((rect.height + padY * 2) * dpr);

      const segments = collectSegments(h1, rect, padX, padY, dpr);
      if (!segments) {
        releaseText();
        return;
      }

      // --- rasterise the headline at the canvas' own resolution ------------
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const ctx = off.getContext("2d");
      if (!ctx) {
        releaseText();
        return;
      }
      ctx.clearRect(0, 0, W, H);
      ctx.textBaseline = "alphabetic";
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${(letterSpacing * dpr).toFixed(2)}px`;
      }
      for (const seg of segments) {
        ctx.font = seg.font;
        ctx.fillStyle = seg.color;
        ctx.fillText(seg.text, seg.x, seg.baseline);
      }
      const pixels = ctx.getImageData(0, 0, W, H).data;

      // --- sample the glyphs on a fixed grid ------------------------------
      let step = Math.max(2, Math.round(dpr * DENSITY));
      let count = 0;
      let targets = new Float32Array(0);
      let colors = new Float32Array(0);
      for (;;) {
        const tp: number[] = [];
        const cl: number[] = [];
        for (let y = 0; y < H; y += step) {
          for (let x = 0; x < W; x += step) {
            const i = (y * W + x) * 4;
            if (pixels[i + 3] < 96) continue; // background / antialias fringe
            tp.push(x, y);
            cl.push(pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255);
          }
        }
        count = tp.length / 2;
        if (count <= MAX_PARTICLES || step >= 8) {
          targets = new Float32Array(tp);
          colors = new Float32Array(cl);
          break;
        }
        step += 1;
      }
      if (count < 64) {
        releaseText();
        return;
      }

      // --- scattered origins, seeded so every reload flies the same way ----
      const origins = new Float32Array(count * 2);
      const delays = new Float32Array(count);
      const rng = mulberry32(0x5eed23);
      const cx = W / 2;
      const cy = H / 2;
      for (let i = 0; i < count; i++) {
        const a = rng();
        const b = rng();
        origins[i * 2] = cx + (a * 2 - 1) * W * 1.05;
        origins[i * 2 + 1] = cy + (b * 2 - 1) * H * 1.25;
        delays[i] = rng();
      }

      // --- GPU side --------------------------------------------------------
      canvas.width = W;
      canvas.height = H;
      canvas.style.left = `${-padX}px`;
      canvas.style.top = `${-padY}px`;
      canvas.style.width = `${W / dpr}px`;
      canvas.style.height = `${H / dpr}px`;

      program = buildProgram(gl);
      if (!program) {
        releaseText();
        return;
      }
      gl.useProgram(program);

      const attach = (name: string, data: Float32Array, size: number) => {
        const buf = gl.createBuffer();
        if (!buf) return null;
        buffers.push(buf);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(program as WebGLProgram, name);
        if (loc < 0) return buf;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        return buf;
      };

      attach("aTarget", targets, 2);
      attach("aOrigin", origins, 2);
      attach("aColor", colors, 3);
      attach("aDelay", delays, 1);

      const uProgress = gl.getUniformLocation(program, "uProgress");
      const uSize = gl.getUniformLocation(program, "uSize");
      const uRes = gl.getUniformLocation(program, "uRes");
      const uPaper = gl.getUniformLocation(program, "uPaper");

      const paper = toRgb(cs.getPropertyValue("--paper") || "#f2ece1", [0.95, 0.93, 0.88]);
      gl.uniform1f(uSize, step * 1.5);
      gl.uniform2f(uRes, W, H);
      gl.uniform3f(uPaper, paper[0], paper[1], paper[2]);
      gl.viewport(0, 0, W, H);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const draw = (progress: number) => {
        gl.uniform1f(uProgress, progress);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, count);
      };

      canvas.addEventListener("webglcontextlost", onContextLost);

      if (debugSettle) {
        // visual-test lab: show the settled frame, never hand the frame back
        h1.style.opacity = "0";
        draw(1);
        return;
      }

      startWidth = window.innerWidth;
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);

      if (document.hidden) {
        draw(1);
        reveal();
        return;
      }

      draw(0); // paint the scattered first frame
      const t0 = performance.now();
      const frame = (now: number) => {
        if (cancelled || revealed) return;
        const t = now - t0;
        const x = Math.min(1, t / assembleMs);
        draw(1 - Math.pow(1 - x, 1.9)); // decelerating assembly ramp
        if (t < assembleMs + dwellMs) {
          raf = requestAnimationFrame(frame);
        } else {
          landedAt = now;
          reveal();
        }
      };
      raf = requestAnimationFrame(frame);
      void landedAt;
    };

    void start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      dropGl();
      releaseText();
    };
    // `speed` is read once per mount on purpose: the assembly is a one-shot
    // entrance, so a changed speed should apply on the next load, not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugSettle]);

  return (
    /* The canvas must live OUTSIDE the <h1>: the pre-paint hold hides the
       headline with opacity 0, and an ancestor's opacity would take the
       particle layer down with it. The wrapper is the positioning context the
       canvas is offset against. */
    <div className={wrapperClassName}>
      <h1 ref={h1Ref} className={className}>
        Every flight
        <span className={hangClassName}>
          you have <em>ever</em>
        </span>
        taken, filed.
      </h1>
      <canvas ref={canvasRef} className={canvasClassName} aria-hidden="true" />
    </div>
  );
}
