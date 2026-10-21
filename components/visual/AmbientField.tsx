'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ShaderProgram } from '@/lib/gl/program'
import { useShaderCanvas, type FrameInfo } from '@/lib/gl/useShaderCanvas'
import { useMotionOK } from '@/lib/hooks/useMotionOK'
import { useTheme } from '@/lib/hooks/useTheme'
import { AMBIENT_FRAG } from './shaders/ambient.frag'

/**
 * The faint aurora behind every dashboard page. Decorative only: aria-hidden, no pointer events
 * (it follows the pointer through a window listener), drawn at a low pixel ratio because it is
 * all soft gradients. One still frame under reduced motion; nothing at all without WebGL2.
 */
export default function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motionOK = useMotionOK()
  const { resolved } = useTheme()
  const light = resolved === 'light'

  const live = useRef({ light, motionOK })
  useEffect(() => {
    live.current = { light, motionOK }
  })
  const target = useRef({ x: 0.6, y: 0.4 })
  const pointer = useRef({ x: 0.6, y: 0.4 })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const draw = useCallback((p: ShaderProgram, f: FrameInfo) => {
    const k = live.current.motionOK ? 1 - Math.exp(-f.dt * 1.5) : 1
    pointer.current.x += (target.current.x - pointer.current.x) * k
    pointer.current.y += (target.current.y - pointer.current.y) * k
    p.f2('u_res', f.width, f.height)
    p.f1('u_time', f.time + 40)
    p.f2('u_pointer', pointer.current.x, pointer.current.y)
    p.f1('u_light', live.current.light ? 1 : 0)
  }, [])

  const { invalidate } = useShaderCanvas(canvasRef, {
    fragment: AMBIENT_FRAG,
    draw,
    still: !motionOK,
    maxDpr: 0.6,
    label: 'AmbientField',
  })

  useEffect(() => {
    invalidate()
  }, [light, invalidate])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  )
}
