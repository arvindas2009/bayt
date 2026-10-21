'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemeChoice } from '@/lib/theme'

const LIGHT_QUERY = '(prefers-color-scheme: light)'
const CHANGE_EVENT = 'bayt-theme-change'

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'
}

function readResolved(): ResolvedTheme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function apply(choice: ThemeChoice) {
  document.documentElement.dataset.theme = choice === 'system' ? systemTheme() : choice
}

// Fires on any change of data-theme (this hook, another tab, the OS) and on a new stored choice.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return
    apply(readChoice())
    onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/**
 * The current theme and a setter. The pre-paint script in app/layout.tsx has already set
 * data-theme, so this only reads and updates it. While the choice is 'system' the page follows
 * OS changes live. The server render assumes dark; the client corrects it on hydration.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readChoice, () => 'system' as ThemeChoice)
  const resolved = useSyncExternalStore(subscribe, readResolved, () => 'dark' as ResolvedTheme)

  useEffect(() => {
    const mq = window.matchMedia(LIGHT_QUERY)
    const onSystem = () => {
      if (readChoice() === 'system') apply('system')
    }
    mq.addEventListener('change', onSystem)
    return () => mq.removeEventListener('change', onSystem)
  }, [])

  const setTheme = useCallback((choice: ThemeChoice) => {
    try {
      if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, choice)
    } catch {
      // Storage blocked: the choice still applies for this page view.
    }
    apply(choice)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { theme, resolved, setTheme }
}
