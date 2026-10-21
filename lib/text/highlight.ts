/**
 * Split a sentence into the parts worth colouring: people, quoted titles, times and figures.
 * Display only: it decorates text that is already on screen and never decides anything. A person
 * part carries the member's id so the colour comes from the id, not from the name.
 */

export type SegmentKind = 'text' | 'person' | 'title' | 'when' | 'figure'

export interface Segment {
  kind: SegmentKind
  text: string
  memberId?: string
}

const WEEKDAY = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues|Tue|Wed|Thurs|Thur|Thu|Fri|Sat|Sun)'
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*'

const TITLE = '"[^"\\n]{1,80}"|\u201C[^\u201D\\n]{1,80}\u201D'
const WHEN = [
  `\\b(?:${WEEKDAY},?\\s)?\\d{1,2}\\s${MONTH}\\b(?:\\s\\d{4})?(?:\\s(?:at|·)\\s\\d{1,2}:\\d{2})?`,
  `\\b${WEEKDAY}\\b(?:\\s(?:at\\s)?\\d{1,2}:\\d{2})?`,
  '\\b\\d{1,2}:\\d{2}\\b',
  '\\b[Tt]oday\\b|\\b[Tt]omorrow\\b|\\b[Tt]onight\\b|\\bthis week\\b',
].join('|')
const FIGURE = [
  '\\b\\d+(?:\\.\\d+)?\\/100\\b',
  '\\b\\d+(?:\\.\\d+)?%',
  '\\b\\d+(?:\\.\\d+)?\\s?(?:hours?|h|days?|tasks?|min|minutes?|points?)\\b',
].join('|')

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function segment(text: string, people: { id: string; name: string }[]): Segment[] {
  if (!text) return []
  const named = people.filter((p) => p.name.trim().length > 1)
  // Longest names first so "Abdullah" wins over "Abd".
  const names = [...named].sort((a, b) => b.name.length - a.name.length).map((p) => escape(p.name))
  const parts = [`(?<title>${TITLE})`, `(?<when>${WHEN})`]
  if (names.length) parts.push(`(?<person>\\b(?:${names.join('|')})(?:['\u2019]s)?\\b)`)
  parts.push(`(?<figure>${FIGURE})`)
  const re = new RegExp(parts.join('|'), 'g')

  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    const g = m.groups ?? {}
    if (g.person) {
      const bare = g.person.replace(/['\u2019]s$/, '')
      out.push({ kind: 'person', text: g.person, memberId: named.find((p) => p.name === bare)?.id })
    } else if (g.title) out.push({ kind: 'title', text: g.title })
    else if (g.when) out.push({ kind: 'when', text: g.when })
    else out.push({ kind: 'figure', text: m[0] })
    last = at + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}
