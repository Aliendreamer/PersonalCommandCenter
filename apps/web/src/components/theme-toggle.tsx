import { useEffect } from 'react'
import {
  ActionIcon,
  Group,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'

/** A user-facing theme choice; `system` maps to Mantine's `auto` color scheme. */
type Choice = 'light' | 'dark' | 'system'

const OPTIONS: ReadonlyArray<{ choice: Choice; label: string; glyph: string }> =
  [
    { choice: 'light', label: 'Light', glyph: '☀' },
    { choice: 'dark', label: 'Dark', glyph: '☾' },
    { choice: 'system', label: 'System', glyph: '◑' },
  ]

/**
 * Header control: choose Light / Dark / System. Built on Mantine's color-scheme hooks; the cookie
 * color-scheme manager (see `lib/theme.ts`) persists the choice to `pcc_theme`. During the Tailwind
 * → Mantine migration this also keeps the `.dark` class in sync with the resolved scheme so any
 * not-yet-migrated Tailwind components re-theme too (drop the effect once Tailwind is removed).
 */
export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const computed = useComputedColorScheme('dark', {
    getInitialValueInEffect: true,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', computed === 'dark')
  }, [computed])

  const current: Choice = colorScheme === 'auto' ? 'system' : colorScheme

  const choose = (choice: Choice) => {
    setColorScheme(choice === 'system' ? 'auto' : choice)
  }

  return (
    <Group gap={2} role="group" aria-label="Theme" wrap="nowrap">
      {OPTIONS.map((option) => (
        <ActionIcon
          key={option.choice}
          variant={current === option.choice ? 'filled' : 'subtle'}
          color="sky"
          size="md"
          aria-label={option.label}
          aria-pressed={current === option.choice}
          title={`${option.label} theme`}
          onClick={() => choose(option.choice)}
        >
          {option.glyph}
        </ActionIcon>
      ))}
    </Group>
  )
}
