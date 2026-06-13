import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/forbidden')({
  component: Forbidden,
})

function Forbidden() {
  return (
    <main className="p-6">
      <h1 className="text-lg font-semibold">Forbidden</h1>
      <p className="text-sm text-gray-600">
        You do not have access to this page.
      </p>
    </main>
  )
}
