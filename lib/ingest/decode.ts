import { getDocumentProxy } from 'unpdf'
import { IngestError } from './types'

/**
 * Turn a PDF into plain text on this machine, before any model sees it.
 *
 * The reading model is text-only, so only PDFs with a text layer can be read. A scan (pages that are
 * pictures of text) has nothing to decode: it is refused with a message, not guessed at.
 */

export const MAX_PDF_PAGES = 20
/** Fewer real characters than this means the pages are pictures, not text. */
const MIN_TEXT_CHARS = 20

export async function decodePdf(bytes: Uint8Array): Promise<{ text: string; pages: number; truncated: boolean }> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>
  try {
    pdf = await getDocumentProxy(bytes)
  } catch (err) {
    if ((err as { name?: string } | null)?.name === 'PasswordException') {
      throw new IngestError('This PDF is locked with a password. Open it, then paste the text instead.', 422)
    }
    throw new IngestError('Bayt could not open that PDF. Try another copy, or paste the text.', 422)
  }

  try {
    const pages = Math.min(pdf.numPages, MAX_PDF_PAGES)
    const texts: string[] = []
    for (let n = 1; n <= pages; n++) {
      const content = await (await pdf.getPage(n)).getTextContent()
      texts.push(content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : '')).join(''))
    }
    // Collapse runs of spaces but keep the line breaks: the date reader splits on them.
    const text = texts
      .join('\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
      throw new IngestError('This PDF looks like a scan, so there is no text in it to read. Paste the text instead.', 422)
    }
    return { text, pages, truncated: pdf.numPages > pages }
  } catch (err) {
    if (err instanceof IngestError) throw err
    throw new IngestError('Bayt could not read the text in that PDF. Try another copy, or paste the text.', 422)
  } finally {
    void pdf.loadingTask.destroy()
  }
}
