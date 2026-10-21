'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { memberColorAt } from '@/lib/design/members'
import { useMotionOK } from '@/lib/hooks/useMotionOK'
import { useTheme } from '@/lib/hooks/useTheme'

/**
 * The landing page's interactive background (three.js through React Three Fiber): a sample
 * household as five swarms of light, one per person, sized by the same sample hours the landing
 * field uses. The cursor pushes particles aside and they spring back; every few seconds a stream
 * of particles flows from the heaviest swarm to another, like a handoff.
 *
 * Decorative and labelled as a sample. It listens to the window for the pointer, so the canvas
 * itself takes no pointer events and never blocks the page. Pauses off screen; one still frame
 * under reduced motion; renders nothing without WebGL.
 */

// Sample hours per person (Salem, Fatima, Layla, Khalid, Aisha), as in LandingField.
const SAMPLE_HOURS = [7.9, 17.5, 1.2, 2.4, 0]
const HEAVIEST = SAMPLE_HOURS.indexOf(Math.max(...SAMPLE_HOURS))
// Swarm centres as fractions of the view (-0.5..0.5), kept mostly right of the headline.
const CENTRES: [number, number][] = [
  [0.12, 0.2],
  [0.3, -0.06],
  [0.08, -0.3],
  [0.42, 0.3],
  [0.22, 0.4],
]
const STREAM_PERIOD = 7 // seconds per handoff pulse

interface Particle {
  cluster: number
  offset: THREE.Vector3
  spin: number
  phase: number
}

function randomInBall(radius: number): THREE.Vector3 {
  // Denser in the middle, with a soft halo.
  const u = Math.random()
  const r = radius * Math.pow(u, 0.6) * (Math.random() < 0.12 ? 1.6 : 1)
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) * 0.6)
}

const VERT = /* glsl */ `
attribute float aScale;
attribute vec3 aColor;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vScale;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * (6.0 / -mv.z);
  vColor = aColor;
  vScale = aScale;
}
`

const FRAG = /* glsl */ `
uniform float uLight;
varying vec3 vColor;
varying float vScale;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5 || vScale < 0.01) discard;
  float a = smoothstep(0.5, 0.0, d);
  a = uLight > 0.5 ? a * 0.85 : a * a * 0.9;
  gl_FragColor = vec4(vColor, a);
}
`

function Swarm({ count, light, animate }: { count: number; light: boolean; animate: boolean }) {
  const { viewport, size, gl, invalidate } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const pointer = useRef({ x: 0, y: 0, on: 0 })
  const streamCount = Math.round(count * 0.07)
  const mainCount = count - streamCount

  // Particles are assigned to swarms in proportion to each person's sample hours (+ a base so nobody vanishes).
  const particles = useMemo<Particle[]>(() => {
    const weights = SAMPLE_HOURS.map((h) => h + 2)
    const total = weights.reduce((a, b) => a + b, 0)
    const list: Particle[] = []
    weights.forEach((w, c) => {
      const n = Math.round((w / total) * mainCount)
      const radius = 0.05 + 0.025 * Math.sqrt(SAMPLE_HOURS[c])
      for (let i = 0; i < n; i++) {
        list.push({ cluster: c, offset: randomInBall(radius), spin: 0.15 + Math.random() * 0.35, phase: Math.random() })
      }
    })
    for (let i = 0; i < streamCount; i++) {
      list.push({ cluster: -1, offset: randomInBall(0.025), spin: 0, phase: Math.random() })
    }
    return list
  }, [mainCount, streamCount])

  const n = particles.length
  const { positions, velocities, scales, colors } = useMemo(() => {
    const positions = new Float32Array(n * 3)
    const velocities = new Float32Array(n * 3)
    const scales = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    return { positions, velocities, scales, colors }
  }, [n])

  // Colours follow the theme: light on dark, darker pigment on paper.
  useEffect(() => {
    const tmp = new THREE.Color()
    particles.forEach((p, i) => {
      const c = p.cluster === -1 ? HEAVIEST : p.cluster
      tmp.set(memberColorAt(c))
      if (light) tmp.multiplyScalar(0.72)
      colors.set([tmp.r, tmp.g, tmp.b], i * 3)
    })
    const geo = pointsRef.current?.geometry
    if (geo) (geo.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
    invalidate()
  }, [particles, colors, light, invalidate])

  // The pointer, in world units on the z = 0 plane, from a window listener (the canvas takes no events).
  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      pointer.current = {
        x: ((e.clientX - r.left) / r.width - 0.5) * viewport.width,
        y: -((e.clientY - r.top) / r.height - 0.5) * viewport.height,
        on: inside ? 1 : 0,
      }
    }
    const onLeave = () => (pointer.current.on = 0)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [gl, viewport.width, viewport.height])

  const centreOf = (c: number, t: number, out: THREE.Vector3) => {
    const [fx, fy] = CENTRES[c]
    // Narrow screens: pull the swarms to the middle, behind the stacked headline.
    const shift = size.width < 900 ? -0.2 : 0
    out.set(
      (fx + shift) * viewport.width + Math.sin(t * 0.21 + c * 1.7) * 0.18,
      fy * viewport.height + Math.cos(t * 0.17 + c * 2.3) * 0.14,
      0,
    )
    return out
  }

  const home = useMemo(() => new THREE.Vector3(), [])
  const centre = useMemo(() => new THREE.Vector3(), [])
  const from = useMemo(() => new THREE.Vector3(), [])
  const to = useMemo(() => new THREE.Vector3(), [])
  const placed = useRef(false)

  useFrame((state, delta) => {
    const t = animate ? state.clock.elapsedTime : 0
    const dt = Math.min(delta, 0.05)
    const h = viewport.height
    const scale = h // offsets are in view-height units
    const ptr = pointer.current
    const R = h * 0.16

    // The current handoff: from the heaviest swarm to the others in turn.
    const targets = [0, 2, 3, 4].filter((c) => c !== HEAVIEST)
    const cycle = Math.floor(t / STREAM_PERIOD)
    const target = targets[cycle % targets.length]
    const u = (t % STREAM_PERIOD) / STREAM_PERIOD

    for (let i = 0; i < n; i++) {
      const p = particles[i]
      const ix = i * 3

      if (p.cluster === -1) {
        // Stream particle: rides an arc from the heaviest swarm to the target, then fades.
        centreOf(HEAVIEST, t, from)
        centreOf(target, t, to)
        const s = Math.min(Math.max(u * 1.8 - p.phase * 0.6, 0), 1)
        const ctrlY = Math.max(from.y, to.y) + h * 0.18
        const mx = (from.x + to.x) / 2
        const a = 1 - s
        home.set(
          a * a * from.x + 2 * a * s * mx + s * s * to.x + p.offset.x * scale,
          a * a * from.y + 2 * a * s * ctrlY + s * s * to.y + p.offset.y * scale,
          p.offset.z * scale,
        )
        positions[ix] = home.x
        positions[ix + 1] = home.y
        positions[ix + 2] = home.z
        scales[i] = animate && s > 0 && s < 1 ? Math.sin(s * Math.PI) * 1.4 : 0
        continue
      }

      // Swarm particle: orbits its centre, springs home, and is pushed by the pointer.
      centreOf(p.cluster, t, centre)
      const ang = t * p.spin + p.phase * 6.28
      const ox = p.offset.x * Math.cos(ang) - p.offset.z * Math.sin(ang)
      const oz = p.offset.x * Math.sin(ang) + p.offset.z * Math.cos(ang)
      home.set(centre.x + ox * scale, centre.y + p.offset.y * scale + Math.sin(t * 0.8 + p.phase * 9) * 0.02, oz * scale)

      if (!placed.current || !animate) {
        positions[ix] = home.x
        positions[ix + 1] = home.y
        positions[ix + 2] = home.z
        scales[i] = 0.55 + p.phase * 0.7
        continue
      }

      let fx = (home.x - positions[ix]) * 9
      let fy = (home.y - positions[ix + 1]) * 9
      const fz = (home.z - positions[ix + 2]) * 9
      if (ptr.on) {
        const dx = positions[ix] - ptr.x
        const dy = positions[ix + 1] - ptr.y
        const d = Math.hypot(dx, dy)
        if (d < R && d > 1e-4) {
          const push = Math.pow(1 - d / R, 2) * 60
          fx += (dx / d) * push
          fy += (dy / d) * push
        }
      }
      const damp = Math.exp(-dt * 5)
      velocities[ix] = velocities[ix] * damp + fx * dt
      velocities[ix + 1] = velocities[ix + 1] * damp + fy * dt
      velocities[ix + 2] = velocities[ix + 2] * damp + fz * dt
      positions[ix] += velocities[ix] * dt
      positions[ix + 1] += velocities[ix + 1] * dt
      positions[ix + 2] += velocities[ix + 2] * dt
    }
    placed.current = true

    const geo = pointsRef.current?.geometry
    if (geo) {
      ;(geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(geo.getAttribute('aScale') as THREE.BufferAttribute).needsUpdate = true
    }
  })

  const uniforms = useMemo(
    () => ({ uSize: { value: 9 }, uPixelRatio: { value: 1 }, uLight: { value: 0 } }),
    [],
  )
  useEffect(() => {
    uniforms.uPixelRatio.value = gl.getPixelRatio()
    uniforms.uLight.value = light ? 1 : 0
    uniforms.uSize.value = light ? 8 : 9
    invalidate()
  }, [gl, light, uniforms, invalidate])

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        key={light ? 'light' : 'dark'}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function HeroScene({ className = '' }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const motionOK = useMotionOK()
  const { resolved } = useTheme()
  const [visible, setVisible] = useState(true)
  const [count] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 2600 : 5200))

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none ${className}`}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        frameloop={!motionOK ? 'demand' : visible ? 'always' : 'never'}
        fallback={null}
        style={{ pointerEvents: 'none' }}
      >
        <Swarm count={count} light={resolved === 'light'} animate={motionOK} />
      </Canvas>
    </div>
  )
}
