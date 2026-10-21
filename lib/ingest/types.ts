import { z } from 'zod'
import { REFERENCE_DURATIONS } from '@/lib/load/reference-durations'

/**
 * The drop-anything inbox.
 *
 * An adapter turns something a person hands Bayt (an uploaded file, pasted text, later an email or a
 * calendar feed) into an `IngestInput`, which is always plain text: files are decoded on the server
 * first, because the reading model is text-only. One extractor reads any input and returns CANDIDATES.
 * Nothing is saved until a person reviews and confirms them.
 */

export const OBLIGATION_CATEGORIES = ['Residency', 'Finance', 'School', 'Health', 'Home'] as const
export const EVENT_CATEGORIES = [
  'education', 'work', 'health', 'medical', 'caregiving', 'extracurricular',
  'social', 'family', 'travel', 'chores', 'personal',
] as const

const TASK_TYPES = Object.keys(REFERENCE_DURATIONS) as [string, ...string[]]

export interface IngestInput {
  kind: 'text'
  text: string
  label: string
  /** Where the text came from: decoded from a PDF, read from a text file, or pasted. */
  source: 'pdf' | 'file' | 'paste'
  /** True when the decoder stopped before the end of the document. */
  truncated?: boolean
}

/** A document Bayt cannot take, with a message a person can act on. */
export class IngestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/** A source of documents. Upload is the first; email and calendar feeds would implement the same shape. */
export interface IngestAdapter<Raw> {
  id: string
  toInput(raw: Raw): Promise<IngestInput>
}

/** What the model may return. Names are aliases (m1, m2) so no internal id is ever sent to it. */
export const ExtractionSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(['obligation', 'event']).describe('obligation = something to do or pay by a deadline; event = something that happens at a time'),
        title: z.string().min(3).max(90).describe('Short, plain title that starts with a verb for obligations'),
        date: z.string().describe('YYYY-MM-DD: the deadline, or the day of the event, exactly as the document states it'),
        time: z.string().nullable().describe('HH:mm 24h when the document gives a time, otherwise null'),
        category: z.string().describe(`Obligations: ${OBLIGATION_CATEGORIES.join(' | ')}. Events: ${EVENT_CATEGORIES.join(' | ')}`),
        taskType: z.enum(TASK_TYPES).describe('How much work this is, from the list. Use generic when unsure'),
        ownerAlias: z.string().nullable().describe('The alias of the person the document is addressed to or assigns it to, else null'),
        consequence: z.string().max(160).describe('What the document says happens if it is missed. Empty string if it says nothing'),
        quote: z.string().max(200).describe('The exact words in the document this item comes from'),
      }),
    )
    .max(8),
})

export type Extraction = z.infer<typeof ExtractionSchema>

/** One thing found in a document, ready to review. */
export interface Candidate {
  /** Stable within one extraction, used as the React key. */
  key: string
  kind: 'obligation' | 'event'
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm, events only. */
  time: string | null
  category: string
  taskType: string
  /** A real member id the document points at, or null (the person reviewing chooses). */
  suggestedOwnerId: string | null
  consequence: string
  quote: string
  /** True when the quote was found in the text we read, false when it comes from a file we cannot search. */
  verified: boolean
}

export interface ExtractionResult {
  candidates: Candidate[]
  /** How the candidates were produced, so the screen can say so. */
  method: 'model' | 'dates'
  notes: string[]
}

/** The reviewed item the confirm route saves. */
export const ConfirmItemSchema = z.object({
  kind: z.enum(['obligation', 'event']),
  title: z.string().trim().min(2).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  category: z.string().max(40),
  taskType: z.string().max(40),
  ownerId: z.string().min(1),
  consequence: z.string().max(240).optional(),
})
export type ConfirmItem = z.infer<typeof ConfirmItemSchema>

export const ConfirmBodySchema = z.object({ items: z.array(ConfirmItemSchema).min(1).max(12) })

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const ACCEPTED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'text',
  'text/markdown': 'text',
}
