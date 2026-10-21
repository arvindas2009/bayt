import { ACCEPTED_FILE_TYPES, MAX_UPLOAD_BYTES, type IngestAdapter, type IngestInput } from '../types'

/** Raw form data from the inbox: either a file or pasted text. */
export interface UploadRaw {
  file: File | null
  text: string
}

export class IngestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/** Upload adapter: a PDF, an image, a text file, or pasted text. */
export const uploadAdapter: IngestAdapter<UploadRaw> = {
  id: 'upload',

  async toInput({ file, text }): Promise<IngestInput> {
    if (file && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) throw new IngestError('That file is over 8 MB. Try a smaller scan, or paste the text.', 413)
      const mediaType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
      if (!(mediaType in ACCEPTED_FILE_TYPES)) {
        throw new IngestError('Bayt can read PDFs, images (PNG, JPG, WebP) and plain text files.', 415)
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (ACCEPTED_FILE_TYPES[mediaType] === 'text') {
        return { kind: 'text', text: new TextDecoder().decode(bytes), label: file.name }
      }
      return { kind: 'file', data: bytes, mediaType, label: file.name }
    }

    const pasted = text.trim()
    if (pasted.length < 8) throw new IngestError('Drop a file or paste some text first.')
    return { kind: 'text', text: pasted, label: 'Pasted text' }
  },
}
