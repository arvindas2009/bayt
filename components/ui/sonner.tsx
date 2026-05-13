'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'var(--surface-container-highest)',
          border: '1px solid var(--outline-variant)',
          color: 'var(--on-surface)',
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: '12px',
          letterSpacing: '0.05em',
        },
      }}
      {...props}
    />
  )
}
