'use client'

import { useEffect, useState } from 'react'
import { Volume2, Square } from 'lucide-react'

/** Reads Arabic text aloud with the browser's own voice. Hidden when there is no Arabic voice. */
export default function ReadAloud({ textAr }: { textAr: string }) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const pick = () => setVoice(synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null)
    pick()
    synth.addEventListener('voiceschanged', pick)
    return () => {
      synth.removeEventListener('voiceschanged', pick)
      synth.cancel()
    }
  }, [])

  if (!voice) return null

  const toggle = () => {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    const u = new SpeechSynthesisUtterance(textAr)
    u.voice = voice
    u.lang = voice.lang
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    synth.speak(u)
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={speaking}
      className="flex w-fit items-center gap-2 rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
    >
      {speaking ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
      {speaking ? 'Stop' : 'اقرأ بصوت عالٍ'}
    </button>
  )
}
