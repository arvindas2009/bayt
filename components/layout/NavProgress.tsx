'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useMotionOK } from '@/lib/hooks/useMotionOK'
import { useNavProgressStore } from '@/store/nav-progress-store'

/** The bar never reaches the end on its own; it only completes when the page is really there. */
const CEILING = 0.9
const TICK_MS = 200
/** Pages register their loading state in an effect just after the URL changes; give them a moment. */
const SETTLE_MS = 150
const FADE_MS = 300
/** Never leave the bar stuck if a navigation fails (a first compile in `next dev` can take a while). */
const GIVE_UP_MS = 30_000

type Phase = 'idle' | 'running' | 'finishing'

/**
 * A bar across the top of the screen from the moment an internal link is clicked until the new
 * page has arrived and its first data has loaded (see `usePageBusy`). The progress is an estimate
 * that slows as it nears the end, so a slow page never looks frozen.
 */
export default function NavProgress() {
  const pathname = usePathname()
  const holds = useNavProgressStore((s) => s.holds)
  const motionOK = useMotionOK()

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  // True once the URL has changed (or there was nothing to wait for, as on a fresh load).
  const [arrived, setArrived] = useState(true)
  const lastPath = useRef(pathname)
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    setArrived(false)
    setProgress(0.15)
    setPhase('running')
    if (giveUp.current) clearTimeout(giveUp.current)
    giveUp.current = setTimeout(() => setArrived(true), GIVE_UP_MS)
  }, [])

  // A fresh load of a page that is still fetching: show the bar until it is done.
  useEffect(() => {
    setProgress(0.15)
    setPhase('running')
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      start()
    }
    // Back and forward buttons.
    const onPop = () => {
      if (window.location.pathname !== lastPath.current) start()
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
      if (giveUp.current) clearTimeout(giveUp.current)
    }
  }, [start])

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    setArrived(true)
  }, [pathname])

  // Creep towards the ceiling, quickly at first and then more slowly.
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setProgress((p) => p + (CEILING - p) * 0.1), TICK_MS)
    return () => clearInterval(id)
  }, [phase])

  // Finish once the page is here and nothing on it is still loading.
  useEffect(() => {
    if (phase !== 'running' || !arrived || holds > 0) return
    const id = setTimeout(() => {
      if (giveUp.current) clearTimeout(giveUp.current)
      setProgress(1)
      setPhase('finishing')
    }, SETTLE_MS)
    return () => clearTimeout(id)
  }, [phase, arrived, holds])

  useEffect(() => {
    if (phase !== 'finishing') return
    const id = setTimeout(() => {
      setPhase('idle')
      setProgress(0)
    }, FADE_MS * 2)
    return () => clearTimeout(id)
  }, [phase])

  if (phase === 'idle') return null
  const value = motionOK ? progress : 1
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-busy={phase === 'running'}
      className="nav-progress"
      data-phase={phase}
    >
      <div className="nav-progress-bar" style={{ transform: `scaleX(${value})` }} />
    </div>
  )
}
