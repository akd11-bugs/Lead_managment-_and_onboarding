'use client'

import { useEffect, useRef } from 'react'

// Ambient WebGL backdrop for the hero. Raw WebGL rather than three.js: this is
// one fullscreen triangle running one fragment shader, so a 3D library would
// add ~600KB to the first page a visitor ever loads for no extra capability.
// Degrades to nothing (transparent canvas, CSS gradient shows through) if the
// context is unavailable, and never starts at all under prefers-reduced-motion.

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

// Domain-warped fbm noise, dark blue-violet, with a slow drift. The warp is
// what keeps it from reading as a generic gradient blur — bands fold into
// each other instead of sliding past.
const FRAG = `
precision mediump float;
uniform vec2 r;
uniform float t;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= r.x / r.y;

  float ts = t * 0.035;
  vec2 q = vec2(fbm(p * 1.1 + ts), fbm(p * 1.1 + vec2(3.2, 1.7) - ts));
  float f = fbm(p * 1.4 + q * 1.6 + ts * 0.5);

  vec3 deep = vec3(0.035, 0.045, 0.085);
  vec3 blue = vec3(0.137, 0.325, 0.863);
  vec3 violet = vec3(0.420, 0.267, 0.890);

  vec3 col = mix(deep, blue, smoothstep(0.35, 0.95, f));
  col = mix(col, violet, smoothstep(0.55, 1.05, f) * 0.55);

  // Fade toward the bottom so the canvas hands off to the page background
  // instead of ending on a hard edge.
  float vign = smoothstep(1.15, 0.15, length(p * vec2(0.65, 1.0)));
  float floorFade = smoothstep(0.0, 0.55, uv.y);
  float alpha = vign * floorFade * 0.85;

  // Dither to kill banding on large flat gradients.
  float d = (hash(gl_FragCoord.xy) - 0.5) * 0.015;
  gl_FragColor = vec4(col + d, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s)
    return null
  }
  return s
}

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    if (!prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uR = gl.getUniformLocation(prog, 'r')
    const uT = gl.getUniformLocation(prog, 't')

    // Cap the backing store: this is an out-of-focus background, so rendering
    // it at full retina resolution burns fill rate nobody can see.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const resize = () => {
      const w = Math.floor(canvas.clientWidth * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uR, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let running = true
    const start = performance.now()

    const frame = (now: number) => {
      if (!running) return
      resize()
      gl.uniform1f(uT, (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // Stop work entirely once the hero scrolls away or the tab is hidden —
    // an animated background has no reason to hold the GPU on page 4.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running && !document.hidden) {
          running = true
          raf = requestAnimationFrame(frame)
        } else if (!e.isIntersecting) {
          running = false
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
