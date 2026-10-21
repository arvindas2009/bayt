'use client'

import { useEffect } from 'react'
import { useNavProgressStore } from '@/store/nav-progress-store'

/** Keeps the top progress bar running while `busy` is true (a page's first data is still loading). */
export function usePageBusy(busy: boolean) {
  const hold = useNavProgressStore((s) => s.hold)
  const release = useNavProgressStore((s) => s.release)

  useEffect(() => {
    if (!busy) return
    hold()
    return release
  }, [busy, hold, release])
}
