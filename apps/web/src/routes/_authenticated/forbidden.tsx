import { createFileRoute } from '@tanstack/react-router'
import { Box, Text, Title } from '@mantine/core'

export const Route = createFileRoute('/_authenticated/forbidden')({
  component: Forbidden,
})

function Forbidden() {
  return (
    <Box component="main" p="lg">
      <Title order={2} size="h4">
        Forbidden
      </Title>
      <Text size="sm" c="dimmed">
        You do not have access to this page.
      </Text>
    </Box>
  )
}
