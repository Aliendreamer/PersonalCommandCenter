/**
 * Guards an external URL before using it as an `href`. Feed/search/Goodreads content is untrusted,
 * so a `javascript:`/`data:` link would be an XSS vector on click — only http(s) is allowed through;
 * anything else (or an unparseable value) becomes a no-op `#`.
 */
export function safeHref(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? url
      : '#'
  } catch {
    return '#'
  }
}
