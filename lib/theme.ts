/**
 * Theme constants shared by the pre-paint script in app/layout.tsx (a server component) and the
 * useTheme hook. Kept out of the 'use client' hook file so the server can import the key.
 */
export const THEME_STORAGE_KEY = 'bayt-theme'

/** What the person chose. 'system' = follow the OS setting. */
export type ThemeChoice = 'light' | 'dark' | 'system'

/** What is on screen. */
export type ResolvedTheme = 'light' | 'dark'
