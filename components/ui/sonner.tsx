'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/lib/hooks/useTheme'

export function Toaster({ ...props }: ToasterProps) {
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      toastOptions={{
        style: {
          background: 'var(--surface-high)',
          border: '1px solid var(--line-strong)',
          borderRadius: '9999px',
          color: 'var(--ink)',
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
        },
      }}
      {...props}
    />
  )
}
