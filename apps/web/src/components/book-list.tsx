import type { Book } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export interface BookListProps {
  books: Book[]
  error?: string
}

/** Lists the current shelf as cover + title + author; titles link out. Degrades on error. */
export function BookList({ books, error }: BookListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-warning">
        Reading list unavailable
      </p>
    )
  }

  if (books.length === 0) {
    return <p className="text-sm text-muted-foreground">No books</p>
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {books.map((book) => (
        <li key={book.link} className="flex gap-2 text-sm">
          {book.coverUrl ? (
            <img
              src={safeHref(book.coverUrl)}
              alt=""
              className="h-16 w-11 flex-none rounded object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <a
              href={safeHref(book.link)}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline"
            >
              {book.title}
            </a>
            {book.author ? (
              <p className="text-xs text-muted-foreground">{book.author}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
