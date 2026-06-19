import { Fragment } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Divider, Group, Paper, Stack, Text } from '@mantine/core'

import { getWeather } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/weather')({
  loader: async () => settle(getWeather()),
  component: WeatherPage,
})

function WeatherPage() {
  const result = Route.useLoaderData()
  const weather = result.data

  return (
    <PluginPage title="Weather">
      {result.error || !weather ? (
        <Text role="status" size="sm" c="yellow.7">
          Weather unavailable
        </Text>
      ) : (
        <>
          <Group gap="xs" align="baseline" mb="lg">
            <Text fz={32} fw={600}>
              {Math.round(weather.current.temperatureC)}°C
            </Text>
            <Text c="dimmed">{weather.current.condition}</Text>
          </Group>
          <Paper withBorder radius="md">
            <Stack gap={0}>
              {weather.daily.map((day, i) => (
                <Fragment key={day.date}>
                  {i > 0 && <Divider />}
                  <Group justify="space-between" px="sm" py="xs">
                    <Text size="sm">
                      {new Date(day.date).toLocaleDateString([], {
                        weekday: 'short',
                      })}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {day.condition}
                    </Text>
                    <Text size="sm">
                      {Math.round(day.highC)}° / {Math.round(day.lowC)}°
                    </Text>
                  </Group>
                </Fragment>
              ))}
            </Stack>
          </Paper>
        </>
      )}
    </PluginPage>
  )
}
