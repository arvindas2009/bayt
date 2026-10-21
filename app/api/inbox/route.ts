import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo/mode'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { extractCandidates } from '@/lib/ingest/extract'
import { IngestError, uploadAdapter } from '@/lib/ingest/adapters/upload'

export const maxDuration = 60

/**
 * POST multipart `{ file? , text? }`: read a document and return what it asks of the family.
 * Nothing is saved here. `/api/inbox/confirm` saves what a person approved.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const text = form.get('text')
    const input = await uploadAdapter.toInput({
      file: file instanceof File ? file : null,
      text: typeof text === 'string' ? text : '',
    })

    const family = await getFamilyWithEverything()
    if (!family) return NextResponse.json({ error: 'No family found. Run npm run seed first.' }, { status: 404 })

    const result = await extractCandidates(family, input, { offline: isDemoMode })
    return NextResponse.json({ ...result, label: input.label })
  } catch (err) {
    if (err instanceof IngestError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[POST /api/inbox]', err)
    return NextResponse.json({ error: 'Could not read that document.' }, { status: 500 })
  }
}
