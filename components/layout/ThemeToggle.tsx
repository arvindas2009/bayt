'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/hooks/useTheme'

/** Switches between dark and light. The choice is remembered; until then the OS setting is used. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, setTheme } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`flex size-9 items-center justify-center rounded-full border border-[var(--line-strong)] text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] ${className}`}
    >
      {resolved === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  )
}
