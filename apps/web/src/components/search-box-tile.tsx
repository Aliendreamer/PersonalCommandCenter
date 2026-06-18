import { useState } from 'react'
import { Button, Group, TextInput } from '@mantine/core'

export interface SearchBoxTileProps {
  /** Called with the trimmed query on submit (the dashboard navigates to /search?q=…). */
  onSearch: (q: string) => void
}

/** Dashboard tile: a small search box that hands the query off to the /search page. */
export function SearchBoxTile({ onSearch }: SearchBoxTileProps) {
  const [q, setQ] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = q.trim()
        if (trimmed) {
          onSearch(trimmed)
        }
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <TextInput
          aria-label="Search the web"
          placeholder="Search the web…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          size="sm"
          style={{ flex: 1 }}
        />
        <Button type="submit" size="sm">
          Go
        </Button>
      </Group>
    </form>
  )
}
