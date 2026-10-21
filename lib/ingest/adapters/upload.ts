import { decodePdf } from '../decode'
import { ACCEPTED_FILE_TYPES, IngestError, MAX_UPLOAD_BYTES, type IngestAdapter, type IngestInput } from '../types'

export { IngestError }

/** Raw form data from the inbox: either a file or pasted text. */
export interface UploadRaw {
  file: File | null
  text: string
}

/** Upload adapter: a PDF or a text file (decoded to text here), or pasted text. */
export const uploadAdapter: IngestAdapter<UploadRaw> = {
  id: 'upload',

  async toInput({ file, text }): Promise<IngestInput> {
    if (file && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) throw new IngestError('That file is over 8 MB. Try a smaller file, or paste the text.', 413)
      const name = file.name.toLowerCase()
      const mediaType =
        file.type || (name.endsWith('.pdf') ? 'application/pdf' : name.endsWith('.md') ? 'text/markdown' : name.endsWith('.txt') ? 'text/plain' : '')
      if (mediaType.startsWith('image/')) {
        throw new IngestError('Bayt reads PDFs and text files. For a photo of a letter, paste or type the text.', 415)
      }
      if (!(mediaType in ACCEPTED_FILE_TYPES)) {
        throw new IngestError('Bayt can read PDFs and plain text files.', 415)
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (ACCEPTED_FILE_TYPES[mediaType] === 'text') {
        return { kind: 'text', text: new TextDecoder().decode(bytes), label: file.name, source: 'file' }
      }
      const pdf = await decodePdf(bytes)
      return { kind: 'text', text: pdf.text, label: file.name, source: 'pdf', truncated: pdf.truncated }
    }

    const pasted = text.trim()
    if (pasted.length < 8) throw new IngestError('Drop a file or paste some text first.')
    return { kind: 'text', text: pasted, label: 'Pasted text', source: 'paste' }
  },
}
