/**
 * Turns the light HTML Goodreads puts in book descriptions into plain text. We never render the
 * markup (no `dangerouslySetInnerHTML`) — tags are dropped and the common entities decoded — so an
 * untrusted feed can't inject an XSS payload through the description.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
