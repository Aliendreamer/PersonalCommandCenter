import { Divider, Group, Stack, Text } from '@mantine/core'
import type { ForecastDay } from '@pcc/contracts'

function conditionIcon(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('thunder') || c.includes('storm')) return '⛈'
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard')) return '❄️'
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧'
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫'
  if (c.includes('overcast') || c.includes('cloud')) return '☁'
  if (c.includes('clear') || c.includes('sunny')) return '☀'
  return '🌤'
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { weekday: 'short' })
}

export function WeatherStrip({ days }: { days: ForecastDay[] }) {
  if (days.length === 0) return null

  return (
    <Group gap={0} align="stretch" wrap="nowrap">
      {days.slice(0, 5).map((day, i) => (
        <Group key={day.date} gap={0} align="stretch" wrap="nowrap">
          {i > 0 && (
            <Divider orientation="vertical" mx="sm" style={{ alignSelf: 'center', height: 32 }} />
          )}
          <Stack gap={0} align="center">
            <Text fz="xs" fw={600} lh={1.3}>
              {shortDay(day.date)}
            </Text>
            <Text fz="xs" c="dimmed" lh={1.3}>
              {conditionIcon(day.condition)} {day.condition}
            </Text>
            <Text fz="xs" c="dimmed" lh={1.3}>
              {day.highC}° / {day.lowC}°
            </Text>
          </Stack>
        </Group>
      ))}
    </Group>
  )
}
