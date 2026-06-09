import { createFileRoute } from '@tanstack/react-router'

// Same-origin proxy: the browser calls /api/* on the web origin and the web server forwards
// to core-api. This avoids a hardcoded API host in client code and means remote access
// (e.g. Tailscale) only needs to reach the web origin.
const apiBaseUrl = process.env.API_URL ?? 'http://localhost:5080'

async function proxy({
  request,
  params,
}: {
  request: Request
  params: { _splat?: string }
}): Promise<Response> {
  const path = params._splat ?? ''
  const { search } = new URL(request.url)
  const headers = new Headers(request.headers)
  headers.delete('host')

  return fetch(`${apiBaseUrl}/api/${path}${search}`, {
    method: request.method,
    headers,
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
  })
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
    },
  },
})
