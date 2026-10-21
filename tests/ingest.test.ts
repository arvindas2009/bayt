import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import { mockFamily } from '@/lib/data/mock-family'
import { decodePdf } from '@/lib/ingest/decode'
import { extractCandidates } from '@/lib/ingest/extract'
import { uploadAdapter } from '@/lib/ingest/adapters/upload'
import { IngestError } from '@/lib/ingest/types'
import type { Family } from '@/types/family'

/** A minimal one-page PDF. With `lines` it has a text layer; without, it only draws a box (like a scan). */
function makePdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`)
  const content = lines.length
    ? `BT /F1 12 Tf 72 720 Td 16 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`
    : '0.5 g 72 72 400 600 re f'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(out)
}

const due = addDays(new Date(), 30)
const FEE_LINE = `Term 2 fees are due on ${format(due, 'dd/MM/yyyy')}.`
// pdf.js takes ownership of (detaches) the bytes it reads, so each test builds its own copy.
const circular = () => makePdf(['Dear Parents,', FEE_LINE, 'Thank you for your support.'])
const family: Family = { ...mockFamily, obligations: [], handoffs: [] }

describe('decodePdf', () => {
  it('reads the text layer of a PDF', async () => {
    const { text, pages, truncated } = await decodePdf(circular())
    expect(text).toContain(FEE_LINE)
    expect(pages).toBe(1)
    expect(truncated).toBe(false)
  })

  it('refuses a PDF with no text in it', async () => {
    await expect(decodePdf(makePdf([]))).rejects.toMatchObject({ status: 422, message: expect.stringMatching(/scan/) })
  })

  it('refuses bytes that are not a PDF', async () => {
    await expect(decodePdf(new TextEncoder().encode('not a pdf at all'))).rejects.toBeInstanceOf(IngestError)
  })
})

describe('uploadAdapter', () => {
  it('turns a PDF into text before anything else sees it', async () => {
    const file = new File([circular() as BlobPart], 'circular.pdf', { type: 'application/pdf' })
    const input = await uploadAdapter.toInput({ file, text: '' })
    expect(input).toMatchObject({ kind: 'text', source: 'pdf', label: 'circular.pdf' })
    expect(input.text).toContain(FEE_LINE)
  })

  it('refuses images, since the reading model is text-only', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'letter.png', { type: 'image/png' })
    await expect(uploadAdapter.toInput({ file, text: '' })).rejects.toMatchObject({ status: 415 })
  })
})

describe('extractCandidates on a decoded PDF', () => {
  it('finds the fee with no model (demo mode), quoted from the document', async () => {
    const input = await uploadAdapter.toInput({
      file: new File([circular() as BlobPart], 'circular.pdf', { type: 'application/pdf' }),
      text: '',
    })
    const result = await extractCandidates(family, input, { offline: true })
    expect(result.error).toBeUndefined()
    expect(result.method).toBe('dates')
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]).toMatchObject({
      kind: 'obligation',
      taskType: 'fee_payment',
      date: format(due, 'yyyy-MM-dd'),
      verified: true,
    })
    expect(input.text).toContain(result.candidates[0].quote)
  })
})
