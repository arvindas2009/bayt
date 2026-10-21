'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { ShaderProgram } from './program'

export interface FrameInfo {
  /** Seconds of visible animation time (does not advance while hidden or paused). */
  time: number
  /** Seconds since the previous frame, clamped so a backgrounded tab does not cause a jump. */
  dt: number
  /** Drawing-buffer size in device pixels. */
  width: number
  height: number
}

interface Options {
  fragment: string
  /** Set uniforms for this frame. The hook binds the program first and draws afterwards. */
  draw: (program: ShaderProgram, frame: FrameInfo) => void
  /** Render one frame (and another on `invalidate()` or resize) instead of looping. */
  still?: boolean
  /** Pixel-ratio cap. A soft background can render well below 1 and be upscaled by the browser. */
  maxDpr?: number
  /** Name used in the error log when the shader fails to build. */
  label?: string
}

/**
 * Drives a full-screen fragment shader on a canvas.
 *  - WebGL2 only. `supported` is null until the first attempt, false when there is no usable
 *    context or the shader fails to build (the caller then renders its CSS fallback).
 *  - Pixel ratio is capped (1.5 by default): the field is a soft glow, extra pixels buy nothing.
 *  - Pauses while the canvas is off screen or the tab is hidden.
 *  - Survives WebGL context loss and restoration.
 */
export function useShaderCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { fragment, draw, still = false, maxDpr = 1.5, label = 'LoadField' }: Options,
) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const drawRef = useRef(draw)
  const stillRef = useRef(still)
  const invalidateRef = useRef<() => void>(() => {})

  useEffect(() => {
    drawRef.current = draw
    stillRef.current = still
  })

  useEffect(() => {
    const found = canvasRef.current
    if (!found) return
    const canvas: HTMLCanvasElement = found

    let gl: WebGL2RenderingContext | null = null
    let program: ShaderProgram | null = null
    let raf = 0
    let dirty = true
    let lost = false
    let onScreen = true
    let tabVisible = !document.hidden
    let time = 0
    let lastNow = 0

    const build = () => {
      gl = canvas.getContext('webgl2', {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
        powerPreference: 'low-power',
      })
      if (!gl) return false
      try {
        program = new ShaderProgram(gl, fragment)
      } catch (err) {
        console.error(`[${label}] shader failed to build`, err)
        return false
      }
      gl.disable(gl.DEPTH_TEST)
      gl.clearColor(0, 0, 0, 0)
      return true
    }

    const resize = () => {
      if (!gl) return
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      dirty = true
    }

    const schedule = () => {
      if (raf || lost || !program) return
      if (!onScreen || !tabVisible) return
      if (stillRef.current && !dirty) return
      raf = requestAnimationFrame(frame)
    }

    function frame(now: number) {
      raf = 0
      if (!gl || !program || lost) return
      const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 0
      lastNow = now
      if (!stillRef.current) time += dt
      gl.clear(gl.COLOR_BUFFER_BIT)
      program.use()
      drawRef.current(program, { time, dt, width: canvas.width, height: canvas.height })
      program.draw()
      dirty = false
      schedule()
    }

    invalidateRef.current = () => {
      dirty = true
      schedule()
    }

    const ok = build()
    // Reports the outcome of a one-time browser capability probe.
    setSupported(ok)
    if (!ok) return

    resize()
    schedule()

    const ro = new ResizeObserver(() => {
      resize()
      schedule()
    })
    ro.observe(canvas)

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) {
        lastNow = 0 // do not count the time spent off screen
        schedule()
      } else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    io.observe(canvas)

    const onVisibility = () => {
      tabVisible = !document.hidden
      if (tabVisible) {
        lastNow = 0
        schedule()
      } else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onLost = (e: Event) => {
      e.preventDefault() // lets the browser restore the context
      lost = true
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => {
      lost = false
      program = null
      if (build()) {
        resize()
        lastNow = 0
        schedule()
      } else {
        setSupported(false)
      }
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      program?.dispose()
      invalidateRef.current = () => {}
    }
  }, [canvasRef, fragment, maxDpr, label])

  // Toggling still <-> animated (reduced-motion preference changed) must restart or settle the loop.
  useEffect(() => {
    invalidateRef.current()
  }, [still])

  const invalidate = useCallback(() => invalidateRef.current(), [])
  return { supported, invalidate }
}
