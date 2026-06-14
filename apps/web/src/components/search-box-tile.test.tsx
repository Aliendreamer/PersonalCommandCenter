import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SearchBoxTile } from './search-box-tile'

afterEach(cleanup)

describe('SearchBoxTile', () => {
  it('calls onSearch with the trimmed query', () => {
    const onSearch = vi.fn()
    render(<SearchBoxTile onSearch={onSearch} />)

    fireEvent.change(screen.getByLabelText('Search the web'), {
      target: { value: '  tanstack  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onSearch).toHaveBeenCalledWith('tanstack')
  })

  it('ignores an empty query', () => {
    const onSearch = vi.fn()
    render(<SearchBoxTile onSearch={onSearch} />)

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onSearch).not.toHaveBeenCalled()
  })
})
