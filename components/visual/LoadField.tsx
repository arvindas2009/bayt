'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShaderCanvas } from '@/lib/gl/useShaderCanvas'
import { useMotionOK } from '@/lib/hooks/useMotionOK'
import { useTheme } from '@/lib/hooks/useTheme'
import { bodyRadius, type FieldBody } from '@/lib/load/field-layout'
import { LOAD_FIELD_FRAG, MAX_BODIES, MAX_FLOWS } from './shaders/loadField.frag'

export interface FieldFlow {
  from: string
  to: string
  /** Progress 0..1.35: 0 = leaving, 1 = arrived, up to 1.35 while the trail fades. */
  t: number
}

interface LoadFieldProps {
  bodies: FieldBody[]
  flows?: FieldFlow[]
  /** This member's body cools to grey and fractures (Resilience Mode). */
  absentId?: string | null
  /** Bodies that pulse failure sparks (they inherit or drop tasks in a stress test). */
  sparkIds?: string[]
  highlightId?: string | null
  onHighlight?: (id: string | null) => void
  onSelect?: (id: string) => void
  /** Sentence a screen reader gets in place of the canvas. */
  ariaLabel: string
  /** 'all' draws every name and figure, 'hover' only the highlighted body. */
  labels?: 'all' | 'hover' | 'none'
  /** Multiplies every body's radius: a compact field can draw bigger bodies. */
  bodyScale?: number
  className?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

interface Smoothed {
  x: number
  y: number
  r: number
  heat: number
  cool: number
  hi: number
  spark: number
}

/** Ease each value toward its target; with `k = 1` it snaps (reduced motion). */
const approach = (cur: number, target: number, k: number) => cur + (target - cur) * k

/**
 * The hero visual: one glowing body per family member, sized and heated by their computed load.
 * Text stays in HTML (crisp, selectable, accessible); the canvas is decoration for the numbers
 * beside it and carries an aria-label with the same fact in words.
 */
export default function LoadField({
  bodies,
  flows = [],
  absentId = null,
  sparkIds = [],
  highlightId = null,
  onHighlight,
  onSelect,
  ariaLabel,
  labels = 'hover',
  bodyScale = 1,
  className = '',
}: LoadFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motionOK = useMotionOK()
  const { resolved: theme } = useTheme()
  const light = theme === 'light'
  const [hoverId, setHoverId] = useState<string | null>(null)
  const activeId = highlightId ?? hoverId

  // Latest props for the draw callback, which must not change identity per render.
  const live = useRef({ bodies, flows, absentId, sparkIds, activeId, motionOK, light, bodyScale })
  useEffect(() => {
    live.current = { bodies, flows, absentId, sparkIds, activeId, motionOK, light, bodyScale }
  })
  const smoothed = useRef(new Map<string, Smoothed>())
  const pointer = useRef({ x: 0.5, y: 0.5, on: 0 })

  const colorData = useMemo(() => {
    const out = new Float32Array(MAX_BODIES * 3)
    bodies.slice(0, MAX_BODIES).forEach((b, i) => out.set(hexToRgb(b.color), i * 3))
    return out
  }, [bodies])

  const colorRef = useRef(colorData)
  useEffect(() => {
    colorRef.current = colorData
  }, [colorData])

  const draw = useCallback(
    (p: import('@/lib/gl/program').ShaderProgram, f: import('@/lib/gl/useShaderCanvas').FrameInfo) => {
      const { bodies: bs, flows: fl, absentId: absent, sparkIds: sparks, activeId: active, motionOK: animate, light: paper, bodyScale: scale } = live.current
      const list = bs.slice(0, MAX_BODIES)
      const k = animate ? 1 - Math.exp(-f.dt * 3.5) : 1

      const bodyData = new Float32Array(MAX_BODIES * 4)
      const stateData = new Float32Array(MAX_BODIES * 4)
      list.forEach((b, i) => {
        const prev = smoothed.current.get(b.id)
        const target = {
          x: b.x,
          y: b.y,
          r: bodyRadius(b.load) * scale,
          heat: b.load,
          cool: b.id === absent ? 1 : 0,
          hi: b.id === active ? 1 : 0,
          spark: sparks.includes(b.id) ? 1 : 0,
        }
        const cur: Smoothed = prev
          ? {
              x: approach(prev.x, target.x, k),
              y: approach(prev.y, target.y, k),
              r: approach(prev.r, target.r, k),
              heat: approach(prev.heat, target.heat, k),
              cool: approach(prev.cool, target.cool, k * 0.6),
              hi: approach(prev.hi, target.hi, Math.min(k * 2, 1)),
              spark: approach(prev.spark, target.spark, k),
            }
          : target
        smoothed.current.set(b.id, cur)
        bodyData.set([cur.x, cur.y, cur.r, cur.heat], i * 4)
        stateData.set([cur.cool, cur.hi, cur.spark, 0], i * 4)
      })

      const indexOf = new Map(list.map((b, i) => [b.id, i]))
      const flowData = new Float32Array(MAX_FLOWS * 4)
      let flowCount = 0
      for (const flow of fl) {
        const a = indexOf.get(flow.from)
        const b = indexOf.get(flow.to)
        if (a === undefined || b === undefined || flowCount >= MAX_FLOWS) continue
        flowData.set([a, b, flow.t, 1], flowCount * 4)
        flowCount++
      }

      p.f2('u_res', f.width, f.height)
      p.f1('u_time', f.time)
      p.i1('u_count', list.length)
      p.v4('u_bodies', bodyData)
      p.v3('u_colors', colorRef.current)
      p.v4('u_state', stateData)
      p.i1('u_flowCount', flowCount)
      p.v4('u_flows', flowData)
      p.f3('u_pointer', pointer.current.x, pointer.current.y, pointer.current.on)
      p.f1('u_light', paper ? 1 : 0)
    },
    [],
  )
  const { supported, invalidate } = useShaderCanvas(canvasRef, {
    fragment: LOAD_FIELD_FRAG,
    draw,
    still: !motionOK,
  })

  // A still frame has no loop, so any change to what is drawn must ask for a repaint.
  useEffect(() => {
    invalidate()
  }, [bodies, flows, absentId, sparkIds, activeId, light, bodyScale, invalidate])

  function nearestBody(clientX: number, clientY: number, rect: DOMRect): string | null {
    const aspect = rect.width / rect.height
    const px = (clientX - rect.left) / rect.width
    const py = (clientY - rect.top) / rect.height
    let best: { id: string; d: number } | null = null
    for (const b of bodies) {
      const dx = (px - b.x) * aspect
      const dy = py - b.y
      const d = Math.hypot(dx, dy)
      if (d < bodyRadius(b.load) * bodyScale * 1.5 && (!best || d < best.d)) best = { id: b.id, d }
    }
    return best?.id ?? null
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    pointer.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, on: 1 }
    const id = nearestBody(e.clientX, e.clientY, rect)
    if (id !== hoverId) {
      setHoverId(id)
      onHighlight?.(id)
    }
    invalidate()
  }

  function onPointerLeave() {
    pointer.current.on = 0
    setHoverId(null)
    onHighlight?.(null)
    invalidate()
  }

  const showLabel = (id: string) => labels === 'all' || (labels === 'hover' && id === activeId)

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={(e) => {
        if (!onSelect) return
        const id = nearestBody(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())
        if (id) onSelect(id)
      }}
    >
      {supported === false ? (
        <GradientFallback bodies={bodies} absentId={absentId} ariaLabel={ariaLabel} />
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="absolute inset-0 size-full" />
      )}

      {labels !== 'none' &&
        bodies.map((b) => {
          const interactive = Boolean(onSelect)
          const visible = showLabel(b.id)
          const Tag = interactive ? 'button' : 'div'
          return (
            <Tag
              key={b.id}
              {...(interactive ? { type: 'button' as const, onClick: () => onSelect?.(b.id) } : {})}
              onFocus={() => {
                setHoverId(b.id)
                onHighlight?.(b.id)
              }}
              onBlur={() => {
                setHoverId(null)
                onHighlight?.(null)
              }}
              tabIndex={interactive ? 0 : -1}
              className="absolute -translate-x-1/2 text-center transition-opacity duration-200"
              style={{
                left: `${b.x * 100}%`,
                top: `${(b.y + bodyRadius(b.load) * bodyScale * 0.75) * 100}%`,
                opacity: visible ? 1 : 0,
                textShadow: 'var(--field-label-shadow)',
                pointerEvents: 'none',
              }}
            >
              <span className="block text-sm font-medium text-[var(--ink)]">{b.label}</span>
              {b.detail && <span className="num block text-xs text-[var(--ink-muted)]">{b.detail}</span>}
            </Tag>
          )
        })}
    </div>
  )
}

/** No WebGL2: the same bodies as soft radial gradients at the same positions. */
function GradientFallback({ bodies, absentId, ariaLabel }: { bodies: FieldBody[]; absentId: string | null; ariaLabel: string }) {
  const background = bodies
    .map((b) => {
      const size = Math.round(bodyRadius(b.load) * 2.2 * 100)
      const color = b.id === absentId ? '#6b7280' : b.color
      return `radial-gradient(circle at ${b.x * 100}% ${b.y * 100}%, ${color}cc 0, ${color}33 ${size * 0.45}%, transparent ${size}%)`
    })
    .join(', ')
  return <div className="absolute inset-0" style={{ background }} role="img" aria-label={ariaLabel} />
}
