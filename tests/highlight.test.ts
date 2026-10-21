import { describe, expect, it } from 'vitest'
import { segment } from '@/lib/text/highlight'

const people = [
  { id: 'a', name: 'Fatima' },
  { id: 'b', name: 'Salem' },
]

const kinds = (text: string) => segment(text, people).filter((s) => s.kind !== 'text').map((s) => [s.kind, s.text, s.memberId])

describe('segment', () => {
  it('keeps the whole sentence when joined back', () => {
    const text = `Fatima: "Renew Emirates ID" is due Thu 23 Oct and nobody else is set up to do it.`
    expect(segment(text, people).map((s) => s.text).join('')).toBe(text)
  })

  it('marks people by id, including the possessive', () => {
    expect(kinds("Salem's load is high")).toEqual([['person', "Salem's", 'b']])
  })

  it('does not match a name inside another word', () => {
    expect(kinds('Salemville is a place')).toEqual([])
  })

  it('marks quoted titles as one part, names inside included', () => {
    expect(kinds('Take over "Fatima pharmacy run" today')).toEqual([
      ['title', '"Fatima pharmacy run"', undefined],
      ['when', 'today', undefined],
    ])
  })

  it('marks dates and times', () => {
    expect(kinds('is due Thu 23 Oct')).toEqual([['when', 'Thu 23 Oct', undefined]])
    expect(kinds('on Monday at 16:30')).toEqual([['when', 'Monday at 16:30', undefined]])
    expect(kinds('was due 2 Oct')).toEqual([['when', '2 Oct', undefined]])
  })

  it('marks figures', () => {
    expect(kinds('load is 88/100 this week (17.5h, 9 days since a rest block), 41%')).toEqual([
      ['figure', '88/100', undefined],
      ['when', 'this week', undefined],
      ['figure', '17.5h', undefined],
      ['figure', '9 days', undefined],
      ['figure', '41%', undefined],
    ])
  })

  it('leaves lowercase weekday look-alikes alone', () => {
    expect(kinds('she sat down')).toEqual([])
  })
})
